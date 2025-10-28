/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-misused-promises */
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const p = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');
  const adminPass = await bcrypt.hash('Admin@123', 10);
  const employeePass = await bcrypt.hash('Employee@123', 10);

  // 🔹 Ensure admin user
  await p.user.upsert({
    where: { email: 'devanath@indyanet.com' },
    update: {},
    create: {
      email: 'devanath@indyanet.com',
      passwordHash: adminPass,
      role: Role.ADMIN,
    },
  });
  await p.user.upsert({
    where: { email: 'pavithra@indyanet.com' },
    update: {},
    create: {
      email: 'pavithra@indyanet.com',
      passwordHash: adminPass,
      role: Role.ADMIN,
    },
  });
  console.log('✅ 2 Admin users created');

  // 🔹 EMPLOYEES
  
  // 🔹 Leave Policies
  const leavePolicies = [
    {
      name: 'Annual Leave',
      region: 'IN',
      accrualPerMonth: 1.75,
      annualQuota: 21,
      maxCarryForward: 12,
      requiresDocAfter: 3,
    },
    {
      name: 'Sick Leave',
      region: 'IN',
      accrualPerMonth: 1,
      annualQuota: 10,
      maxCarryForward: 0,
      requiresDocAfter: 2,
    },
    {
      name: 'Casual Leave',
      region: 'IN',
      accrualPerMonth: 0.5,
      annualQuota: 6,
      maxCarryForward: 0,
      requiresDocAfter: 0,
    },
    {
      name: 'Special Leave',
      region: 'IN',
      accrualPerMonth: 1,
      annualQuota: 12,
      maxCarryForward: 0,
      requiresDocAfter: 0,
      description: 'Special leave (max 1 per month, 12 per year)',
    },
  ];

  for (const lp of leavePolicies) {
    await p.leavePolicy.upsert({
      where: { name: lp.name },
      update: lp,
      create: lp,
    });
  }
  console.log(`✅ ${leavePolicies.length} leave policies created`);

  // 🔹 Dynamic Leave Balances
  const allEmployees = await p.employee.findMany();
  const allPolicies = await p.leavePolicy.findMany();
  const currentPeriod = new Date().toISOString().slice(0, 7);

  for (const emp of allEmployees) {
    for (const policy of allPolicies) {
      const annualQuota = policy.annualQuota ?? 0;
      const accrual = policy.accrualPerMonth ?? 0;
      const usedDays = Math.floor(Math.random() * 5);
      const closing = Math.max(annualQuota - usedDays, 0);

      await p.leaveBalance.upsert({
        where: {
          employeeId_policyId_period: {
            employeeId: emp.id,
            policyId: policy.id,
            period: currentPeriod,
          },
        },
        update: {
          allotted: annualQuota,
          used: usedDays,
          closing,
        },
        create: {
          employeeId: emp.id,
          policyId: policy.id,
          period: currentPeriod,
          allotted: annualQuota,
          opening: annualQuota / 2,
          accrued: accrual,
          used: usedDays,
          adjusted: 0,
          closing,
        },
      });
    }
  }
  console.log('✅ Dynamic leave balances created');

  // 🔹 Holidays
  const holidays = [
    {
      name: 'Diwali',
      date: new Date('2025-10-21'),
      description: 'Festival of Lights',
      isRecurring: true,
    },
    {
      name: 'Christmas',
      date: new Date('2025-12-25'),
      description: 'Christmas Day',
      isRecurring: true,
    },
    {
      name: 'New Year',
      date: new Date('2026-01-01'),
      description: 'New Year',
      isRecurring: true,
    },
    {
      name: 'Republic Day',
      date: new Date('2026-01-26'),
      description: 'Indian Republic Day',
      isRecurring: true,
    },
  ];

  for (const holiday of holidays) {
    await p.holiday.upsert({
      where: { name: holiday.name },
      update: holiday,
      create: holiday,
    });
  }
  console.log(`✅ ${holidays.length} holidays added`);

  // 🔹 Payroll Run for Current Month
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const nextPayDate = new Date(now.getFullYear(), now.getMonth() + 1, 5);

  const existingRun = await p.payrollRun.findFirst({
    where: {
      periodStart: currentMonthStart,
      periodEnd: currentMonthEnd,
    },
  });

  let run;
  if (!existingRun) {
    run = await p.payrollRun.create({
      data: {
        periodStart: currentMonthStart,
        periodEnd: currentMonthEnd,
        payDate: nextPayDate,
        status: 'APPROVED',
      },
    });
    console.log(
      `✅ Payroll run created for ${currentMonthStart.toLocaleString(
        'default',
        {
          month: 'long',
          year: 'numeric',
        },
      )}`,
    );
  } else {
    run = existingRun;
    console.log('ℹ️ Payroll run for current month already exists, skipping');
  }

  // 🔹 Generate Payslips for Each Employee
  for (const emp of allEmployees) {
    const gross = Math.floor(80000 + Math.random() * 20000);
    const deductions = Math.floor(gross * 0.1);
    const net = gross - deductions;

    await p.payslip.upsert({
      where: {
        employeeId_payrollRunId: { employeeId: emp.id, payrollRunId: run.id },
      },
      update: { gross, deductions, net, currency: 'INR' },
      create: {
        employeeId: emp.id,
        payrollRunId: run.id,
        gross,
        deductions,
        net,
        currency: 'INR',
        lines: [
          { label: 'Base Salary', amount: gross },
          { label: 'Deductions', amount: deductions },
          { label: 'Net Pay', amount: net },
        ],
      },
    });
  }
  console.log(`✅ Payslips generated for ${allEmployees.length} employees`);

  console.log('\n🎉 Seeding completed successfully!');
  console.log('🧠 Summary:');
  console.log(`- Admin login: adminGmail / Admin@123`);
 // console.log(`- Employee login: any employee email / Employee@123`);
  console.log(`- Policies: ${leavePolicies.length}`);
  console.log(`- Holidays: ${holidays.length}`);
  console.log(
    `- Payroll run: ${currentMonthStart.toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    })}`,
  );
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await p.$disconnect();
  });
