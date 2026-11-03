import type { ReflectionModel } from "../models/reflectionModel";

export interface ReflectionRepository {
  create(reflection: ReflectionModel): Promise<ReflectionModel>;
  list(userId: string): Promise<ReflectionModel[]>;
  update(reflection: ReflectionModel): Promise<ReflectionModel>;
  remove(id: string): Promise<void>;
}
