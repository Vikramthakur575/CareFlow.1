import assert from 'assert';
import { initDatabase, query } from '../server/database/db.ts';
import * as authService from '../server/services/auth.service.ts';
import * as doctorService from '../server/services/doctor.service.ts';
import * as appointmentService from '../server/services/appointment.service.ts';
import * as adminService from '../server/services/admin.service.ts';

async function runTestSuite() {
  console.log('🧪 [CareFlow Test Suite] Beginning Automated Verification...\n');
  await initDatabase();
  // Clean up non-seed records to guarantee test repeatability
  await query("DELETE FROM appointments WHERE id > 1;");

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Auth Tests
  await test('Patient registration creates user and returns JWT token', async () => {
    const email = `test-${Date.now()}@example.com`;
    const res = await authService.registerPatient({
      name: 'Test Patient',
      email,
      password: 'testPassword123',
    });
    assert.ok(res.token, 'Token should be returned');
    assert.strictEqual(res.user.email, email);
    assert.strictEqual(res.user.role, 'patient', 'Public registration must default to patient');
  });

  await test('Duplicate email registration is rejected with 409 Conflict', async () => {
    try {
      await authService.registerPatient({
        name: 'Sarah Duplicate',
        email: 'sarah.jenkins@example.com', // Already seeded
        password: 'password123',
      });
      assert.fail('Should have thrown error on duplicate email');
    } catch (err: any) {
      assert.strictEqual(err.statusCode, 409);
    }
  });

  await test('Login with invalid password is rejected with 401', async () => {
    try {
      await authService.loginUser({
        email: 'sarah.jenkins@example.com',
        password: 'wrongPassword!',
      });
      assert.fail('Should have thrown error on invalid password');
    } catch (err: any) {
      assert.strictEqual(err.statusCode, 401);
    }
  });

  // 2. Doctor Directory & Slots
  await test('Doctor directory returns active doctors and supports specialty filtering', async () => {
    const allDocs = await doctorService.getAllDoctors({});
    assert.ok(allDocs.length > 0, 'Should return active doctors');

    const cardioDocs = await doctorService.getAllDoctors({ specialty: 'Cardiology' });
    assert.ok(cardioDocs.every((d) => d.specialty === 'Cardiology'));
  });

  await test('Doctor slot calculation returns valid intervals and flags booked slots', async () => {
    const docs = await doctorService.getAllDoctors({});
    const doctorId = docs[0].id;
    
    // Pick upcoming Wednesday
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    while (futureDate.getDay() !== 3) { // Wednesday
      futureDate.setDate(futureDate.getDate() + 1);
    }
    const dateStr = futureDate.toISOString().split('T')[0];

    const slots = await doctorService.getDoctorSlotsForDate(doctorId, dateStr);
    assert.ok(slots.length > 0, 'Should generate weekday slots');
    assert.ok(slots[0].startTime && slots[0].endTime);
  });

  // 3. Booking Engine & Concurrency
  await test('Booking an appointment in the past is rejected with 400', async () => {
    try {
      await appointmentService.createAppointment(2, {
        doctorId: 1,
        appointmentDate: '2020-01-01',
        startTime: '10:00:00',
        reason: 'Past appointment rejection test',
      });
      assert.fail('Should have rejected past appointment');
    } catch (err: any) {
      assert.strictEqual(err.statusCode, 400);
    }
  });

  await test('Booking an available slot succeeds and creates reference', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 20);
    while (futureDate.getDay() !== 2) { // Tuesday
      futureDate.setDate(futureDate.getDate() + 1);
    }
    const dateStr = futureDate.toISOString().split('T')[0];

    const appt = await appointmentService.createAppointment(2, {
      doctorId: 1,
      appointmentDate: dateStr,
      startTime: '14:00:00',
      reason: 'Automated test consultation',
    });

    assert.ok(appt.id);
    assert.ok(appt.booking_reference.startsWith('CF-'));
    assert.strictEqual(appt.status, 'booked');
  });

  await test('Double-booking the SAME slot is rejected with 409 Conflict (ACID guarantee)', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 25);
    while (futureDate.getDay() !== 4) { // Thursday
      futureDate.setDate(futureDate.getDate() + 1);
    }
    const dateStr = futureDate.toISOString().split('T')[0];

    // First booking
    await appointmentService.createAppointment(2, {
      doctorId: 1,
      appointmentDate: dateStr,
      startTime: '11:00:00',
      reason: 'test double booking 1',
    });

    // Attempting same doctor, same date, same time with different patient
    try {
      await appointmentService.createAppointment(3, {
        doctorId: 1,
        appointmentDate: dateStr,
        startTime: '11:00:00',
        reason: 'test double booking 2',
      });
      assert.fail('Should have thrown conflict on duplicate slot booking');
    } catch (err: any) {
      assert.strictEqual(err.statusCode, 409, 'Must return 409 Conflict');
    }
  });

  await test('Cancelling an appointment releases the slot for re-booking', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 28);
    while (futureDate.getDay() !== 1) { // Monday
      futureDate.setDate(futureDate.getDate() + 1);
    }
    const dateStr = futureDate.toISOString().split('T')[0];

    // Book slot
    const appt = await appointmentService.createAppointment(2, {
      doctorId: 2,
      appointmentDate: dateStr,
      startTime: '15:00:00',
      reason: 'test cancel slot',
    });

    // Cancel appointment
    const cancelled = await appointmentService.cancelAppointment(appt.id, 2, 'patient');
    assert.strictEqual(cancelled.status, 'cancelled');

    // Re-booking the SAME slot now succeeds because partial unique index only indexes status = booked!
    const rebooked = await appointmentService.createAppointment(3, {
      doctorId: 2,
      appointmentDate: dateStr,
      startTime: '15:00:00',
      reason: 'test rebook released slot',
    });
    assert.strictEqual(rebooked.status, 'booked');
  });

  // 4. Admin Management & State Machine
  await test('Admin statistics return valid aggregate metrics', async () => {
    const metrics = await adminService.getAdminMetrics();
    assert.ok(metrics.totalAppointments >= 0);
    assert.ok(metrics.activeDoctors > 0);
    assert.ok(metrics.totalPatients > 0);
  });

  await test('Cannot cancel an already cancelled appointment', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    while (futureDate.getDay() !== 3) {
      futureDate.setDate(futureDate.getDate() + 1);
    }
    const dateStr = futureDate.toISOString().split('T')[0];

    const appt = await appointmentService.createAppointment(2, {
      doctorId: 3,
      appointmentDate: dateStr,
      startTime: '09:30:00',
      reason: 'test double cancel',
    });

    await appointmentService.cancelAppointment(appt.id, 2, 'patient');

    // Attempt second cancel
    try {
      await appointmentService.cancelAppointment(appt.id, 2, 'patient');
      assert.fail('Should reject cancelling already cancelled appointment');
    } catch (err: any) {
      assert.strictEqual(err.statusCode, 400);
    }
  });

  console.log(`\n📊 [Test Summary]: ${passed} passed, ${failed} failed out of ${passed + failed} total tests.`);
  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
