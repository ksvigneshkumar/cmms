import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { addDays, format, parseISO } from 'date-fns';

export async function GET(request) {
  try {
    const today = new Date();
    const formattedToday = format(today, 'yyyy-MM-dd');

    // 1. Fetch all schedules that are due today or overdue
    const { data: schedules, error: scheduleError } = await supabase
      .from('preventive_schedules')
      .select('*')
      .lte('next_due', formattedToday);

    if (scheduleError) throw scheduleError;

    if (!schedules || schedules.length === 0) {
      return NextResponse.json({ message: 'No schedules due today.' }, { status: 200 });
    }

    const results = [];

    // 2. Process each due schedule
    for (const schedule of schedules) {
      // Find the asset ID based on asset_name
      const { data: assetData } = await supabase
        .from('assets')
        .select('id')
        .eq('name', schedule.asset_name)
        .single();

      if (assetData) {
        // Create Work Order
        const { data: woData, error: woError } = await supabase
          .from('work_orders')
          .insert({
            asset_id: assetData.id,
            issue: `[PM] ${schedule.type}`,
            priority: 'Medium',
            status: 'Open'
          })
          .select()
          .single();

        if (woError) {
          results.push({ schedule: schedule.id, status: 'Failed to create WO', error: woError });
          continue;
        }

        // Calculate Next Due Date
        const currentDueDate = parseISO(schedule.next_due);
        let daysToAdd = 30; // Default Monthly
        
        if (schedule.frequency.includes('7')) daysToAdd = 7;
        else if (schedule.frequency.includes('14')) daysToAdd = 14;
        else if (schedule.frequency.includes('30')) daysToAdd = 30;
        else if (schedule.frequency.includes('90')) daysToAdd = 90;
        else if (schedule.frequency.includes('365')) daysToAdd = 365;

        const nextDueDate = format(addDays(currentDueDate, daysToAdd), 'yyyy-MM-dd');
        const lastChecked = format(new Date(), 'dd MMM yyyy, HH:mm');

        // Update Schedule
        const { error: updateError } = await supabase
          .from('preventive_schedules')
          .update({
            next_due: nextDueDate,
            status: 'Scheduled',
            last_checked: lastChecked
          })
          .eq('id', schedule.id);

        if (updateError) {
          results.push({ schedule: schedule.id, status: 'Failed to update schedule date', error: updateError });
        } else {
          results.push({ schedule: schedule.id, status: 'Success', next_due: nextDueDate });
        }
      } else {
        results.push({ schedule: schedule.id, status: 'Asset not found' });
      }
    }

    return NextResponse.json({ 
      message: `Processed ${schedules.length} schedules.`, 
      results 
    }, { status: 200 });

  } catch (err) {
    console.error('CRON ERROR:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
