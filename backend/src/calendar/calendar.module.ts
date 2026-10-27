import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Habit, HabitEvent } from '../habits/habit.entity';
import { Task } from '../tasks/task.entity';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';

@Module({
  imports: [TypeOrmModule.forFeature([Task, Habit, HabitEvent])],
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {}
