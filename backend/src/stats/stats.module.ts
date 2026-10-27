import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HabitEvent } from '../habits/habit.entity';
import { Task } from '../tasks/task.entity';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [TypeOrmModule.forFeature([Task, HabitEvent])],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
