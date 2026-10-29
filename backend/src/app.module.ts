import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { CalendarModule } from './calendar/calendar.module';
import { APP_CONFIG, loadConfig } from './config/configuration';
import { HabitsModule } from './habits/habits.module';
import { HealthController } from './health.controller';
import { MailModule } from './mail/mail.module';
import { NotesModule } from './notes/notes.module';
import { RealtimeModule } from './realtime/realtime.module';
import { StatsModule } from './stats/stats.module';
import { TasksModule } from './tasks/tasks.module';
import { TimersModule } from './timers/timers.module';
import { UsersModule } from './users/users.module';
import { WorkspacesModule } from './workspaces/workspaces.module';

@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useFactory: loadConfig }],
  exports: [APP_CONFIG],
})
class ConfigModule {}

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: ReturnType<typeof loadConfig>) => ({
        type: 'postgres' as const,
        url: config.databaseUrl,
        autoLoadEntities: true,
        // Creates and updates the tables from the entities. Turn off (DB_SYNCHRONIZE=false) to manage the schema yourself.
        synchronize: config.synchronize,
      }),
    }),
    MailModule,
    UsersModule,
    WorkspacesModule,
    AuthModule,
    RealtimeModule,
    TasksModule,
    HabitsModule,
    StatsModule,
    CalendarModule,
    NotesModule,
    TimersModule,
  ],
})
export class AppModule {}
