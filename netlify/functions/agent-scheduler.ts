import { schedule } from '@netlify/functions';
import { getSupabaseAdmin } from './_shared/supabase';
import { createArticleForJournalist } from './_shared/articleLifecycle';
import { runPipelineStepForArticle } from './_shared/pipeline';

function calculateNextRunAt(scheduleRecord: any, fromDate: Date = new Date()): Date {
  const next = new Date(fromDate);
  next.setUTCHours(scheduleRecord.preferred_hour_utc, 0, 0, 0);

  if (scheduleRecord.frequency === 'daily') {
    if (next <= fromDate) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    return next;
  } else if (scheduleRecord.frequency === 'weekly') {
    const days = scheduleRecord.days_of_week && scheduleRecord.days_of_week.length ? scheduleRecord.days_of_week : [1, 3, 5];
    for (let i = 0; i < 8; i++) {
      if (i > 0 || next <= fromDate) {
        next.setUTCDate(next.getUTCDate() + 1);
      }
      if (days.includes(next.getUTCDay())) {
        return next;
      }
    }
  }
  // Manual or default fallback
  return new Date(fromDate.getTime() + 24 * 60 * 60 * 1000);
}

export const handler = schedule('@hourly', async (event) => {
  const startTime = Date.now();
  const supabase = getSupabaseAdmin();
  let jobsCreated = 0;
  let jobsProcessed = 0;
  let errorMsg = '';
  let notes = '';

  // 1. Initialize agent_run record
  const { data: runRecord, error: runError } = await supabase
    .from('agent_runs')
    .insert({
      run_type: 'scheduler',
      status: 'running',
      jobs_created: 0,
      jobs_processed: 0
    })
    .select('*')
    .single();

  if (runError) {
    console.error('Failed to create agent_run record:', runError);
    return { statusCode: 500, body: JSON.stringify({ error: runError.message }) };
  }

  try {
    // 2. Fetch all enabled schedules
    const { data: schedules, error: schedulesError } = await supabase
      .from('journalist_schedules')
      .select('*')
      .eq('enabled', true);

    if (schedulesError) throw schedulesError;

    const now = new Date();

    // Loop schedules to check if any are due
    for (const sched of (schedules || [])) {
      if (!sched.next_run_at) {
        const nextRun = calculateNextRunAt(sched, now);
        await supabase
          .from('journalist_schedules')
          .update({ next_run_at: nextRun.toISOString() })
          .eq('id', sched.id);
        continue;
      }

      const nextRunDate = new Date(sched.next_run_at);
      if (nextRunDate <= now) {
        // Schedule is due!
        // 2a. Check limits:
        // - Weekly Quota check
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { count: weeklyCount, error: countError } = await supabase
          .from('articles')
          .select('*', { count: 'exact', head: true })
          .eq('journalist_id', sched.journalist_id)
          .gte('created_at', sevenDaysAgo);

        if (countError) throw countError;

        if (weeklyCount !== null && weeklyCount >= sched.weekly_quota) {
          notes += `Journalist ${sched.journalist_id} skipped: Weekly quota reached (${weeklyCount}/${sched.weekly_quota}).\n`;
          const nextRun = calculateNextRunAt(sched, now);
          await supabase
            .from('journalist_schedules')
            .update({
              next_run_at: nextRun.toISOString(),
              last_run_at: now.toISOString()
            })
            .eq('id', sched.id);
          continue;
        }

        // - Max Pending Reviews check
        const { count: pendingCount, error: pendingError } = await supabase
          .from('articles')
          .select('*', { count: 'exact', head: true })
          .eq('journalist_id', sched.journalist_id)
          .eq('status', 'awaiting_admin_review');

        if (pendingError) throw pendingError;

        if (pendingCount !== null && pendingCount >= sched.max_pending_reviews) {
          notes += `Journalist ${sched.journalist_id} skipped: Max pending reviews reached (${pendingCount}/${sched.max_pending_reviews}).\n`;
          const nextRun = calculateNextRunAt(sched, now);
          await supabase
            .from('journalist_schedules')
            .update({
              next_run_at: nextRun.toISOString(),
              last_run_at: now.toISOString()
            })
            .eq('id', sched.id);
          continue;
        }

        // 2b. Create agent job
        const { error: jobCreateError } = await supabase
          .from('agent_jobs')
          .insert({
            job_type: 'create_article',
            journalist_id: sched.journalist_id,
            status: 'pending',
            scheduled_for: now.toISOString()
          });

        if (jobCreateError) throw jobCreateError;

        jobsCreated++;
        notes += `Created create_article job for ${sched.journalist_id}.\n`;

        // Update schedule next run
        const nextRun = calculateNextRunAt(sched, now);
        await supabase
          .from('journalist_schedules')
          .update({
            next_run_at: nextRun.toISOString(),
            last_run_at: now.toISOString()
          })
          .eq('id', sched.id);
      }
    }

    // 3. Process pending/failed jobs in batch
    const { data: jobs, error: jobsError } = await supabase
      .from('agent_jobs')
      .select('*')
      .in('status', ['pending', 'failed'])
      .lt('attempts', 3)
      .lte('scheduled_for', now.toISOString())
      .order('priority', { ascending: false })
      .order('scheduled_for', { ascending: true })
      .limit(3);

    if (jobsError) throw jobsError;

    for (const job of (jobs || [])) {
      if (Date.now() - startTime > 22000) {
        notes += `Execution time limit approaching. Pausing job processing.\n`;
        break;
      }

      await supabase
        .from('agent_jobs')
        .update({
          status: 'running',
          locked_at: new Date().toISOString(),
          attempts: job.attempts + 1
        })
        .eq('id', job.id);

      try {
        if (job.job_type === 'create_article') {
          const { data: sched } = await supabase
            .from('journalist_schedules')
            .select('*')
            .eq('journalist_id', job.journalist_id)
            .maybeSingle();

          const result = await createArticleForJournalist({ journalistId: job.journalist_id });
          jobsProcessed++;

          if (sched && sched.auto_advance) {
            let currentStatus = 'idea';
            const stopStatus = sched.stop_status || 'awaiting_admin_review';

            while (currentStatus !== stopStatus && currentStatus !== 'awaiting_admin_review') {
              if (Date.now() - startTime > 22000) {
                await supabase.from('agent_jobs').insert({
                  job_type: 'run_pipeline_step',
                  journalist_id: job.journalist_id,
                  article_id: result.article_id,
                  status: 'pending',
                  scheduled_for: new Date().toISOString()
                });
                notes += `Create article succeeded. Pipeline auto-advance paused due to timeout; queued next step.\n`;
                break;
              }

              const stepResult = await runPipelineStepForArticle(result.article_id);
              currentStatus = stepResult.status;
            }
          }

          await supabase
            .from('agent_jobs')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              article_id: result.article_id
            })
            .eq('id', job.id);

        } else if (job.job_type === 'run_pipeline_step') {
          if (!job.article_id) throw new Error('article_id is missing for run_pipeline_step job');

          const { data: sched } = await supabase
            .from('journalist_schedules')
            .select('*')
            .eq('journalist_id', job.journalist_id)
            .maybeSingle();

          const { data: article } = await supabase
            .from('articles')
            .select('status')
            .eq('id', job.article_id)
            .single();

          if (!article) throw new Error('Article not found for pipeline step');

          let currentStatus = article.status;
          const stopStatus = sched?.stop_status || 'awaiting_admin_review';

          while (currentStatus !== stopStatus && currentStatus !== 'awaiting_admin_review') {
            if (Date.now() - startTime > 22000) {
              await supabase.from('agent_jobs').insert({
                job_type: 'run_pipeline_step',
                journalist_id: job.journalist_id,
                article_id: job.article_id,
                status: 'pending',
                scheduled_for: new Date().toISOString()
              });
              notes += `Pipeline step advanced. Pause due to timeout; queued next step.\n`;
              break;
            }

            const stepResult = await runPipelineStepForArticle(job.article_id);
            currentStatus = stepResult.status;
          }

          jobsProcessed++;

          await supabase
            .from('agent_jobs')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', job.id);
        }
      } catch (jobErr: any) {
        console.error(`Error processing job ${job.id}:`, jobErr);
        await supabase
          .from('agent_jobs')
          .update({
            status: 'failed',
            error: jobErr.message || String(jobErr)
          })
          .eq('id', job.id);
      }
    }

    await supabase
      .from('agent_runs')
      .update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        jobs_created: jobsCreated,
        jobs_processed: jobsProcessed,
        notes: notes || 'Scheduler executed successfully.'
      })
      .eq('id', runRecord.id);

  } catch (err: any) {
    console.error('Scheduler execution failed:', err);
    errorMsg = err.message || String(err);
    await supabase
      .from('agent_runs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        jobs_created: jobsCreated,
        jobs_processed: jobsProcessed,
        error: errorMsg,
        notes: notes
      })
      .eq('id', runRecord.id);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: errorMsg ? 'failed' : 'completed',
      jobs_created: jobsCreated,
      jobs_processed: jobsProcessed,
      error: errorMsg || undefined
    })
  };
});
