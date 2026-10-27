import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Habit, HabitEvent } from './habit.entity';
import { HabitsController } from './habits.controller';
import { HabitsService } from './habits.service';

@Module({
  imports: [TypeOrmModule.forFeature([Habit, HabitEvent])],
  controllers: [HabitsController],
  providers: [HabitsService],
})
export class HabitsModule {}
