import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MarkmapsModule } from './markmaps/markmaps.module';
import { UsersModule } from './users/users.module';
import { SeriesModule } from './series/series.module';
import { KeynodesModule } from './keynodes/keynodes.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ApiKeysModule } from './api-keys/api-keys.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
    }),
    PrismaModule,
    AuthModule,
    MarkmapsModule,
    UsersModule,
    SeriesModule,
    KeynodesModule,
    ComplaintsModule,
    AdminModule,
    NotificationsModule,
    ApiKeysModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
