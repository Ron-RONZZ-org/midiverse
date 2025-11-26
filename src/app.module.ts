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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    MarkmapsModule,
    UsersModule,
    SeriesModule,
    KeynodesModule,
    ComplaintsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
