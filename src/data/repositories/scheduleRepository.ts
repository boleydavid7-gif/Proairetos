import type { ScheduleExceptionModel, SchedulePatternModel } from "../models/scheduleModel";

export interface SchedulePatternRepository {
  list(userId: string): Promise<SchedulePatternModel[]>;
  add(pattern: SchedulePatternModel): Promise<SchedulePatternModel>;
  put(pattern: SchedulePatternModel): Promise<SchedulePatternModel>;
  remove(id: string): Promise<void>;
}

export interface ScheduleExceptionRepository {
  list(userId: string): Promise<ScheduleExceptionModel[]>;
  put(exception: ScheduleExceptionModel): Promise<ScheduleExceptionModel>;
  remove(id: string): Promise<void>;
}
