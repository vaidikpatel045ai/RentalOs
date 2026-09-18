import { isPast, isToday } from "date-fns";

interface Groupable {
  dueAt: Date | null;
  status: string;
}

export interface JobGroups<T> {
  overdue: T[];
  today: T[];
  upcoming: T[];
  completed: T[];
}

/** Splits a worker's jobs into the "MY TASKS TODAY" workload view from the
 * spec (Today / Overdue / Upcoming / Completed) — shared by the tailor and
 * cleaner portals. */
export function groupJobsByTimeline<T extends Groupable>(jobs: T[], completedStatus: string): JobGroups<T> {
  const groups: JobGroups<T> = { overdue: [], today: [], upcoming: [], completed: [] };

  for (const job of jobs) {
    if (job.status === completedStatus) {
      groups.completed.push(job);
    } else if (job.dueAt && isPast(job.dueAt) && !isToday(job.dueAt)) {
      groups.overdue.push(job);
    } else if (job.dueAt && isToday(job.dueAt)) {
      groups.today.push(job);
    } else {
      groups.upcoming.push(job);
    }
  }

  return groups;
}
