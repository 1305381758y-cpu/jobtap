import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AdminRole {
  Operator = 'operator',
  Owner = 'owner',
}

export enum AdminStatus {
  Active = 'active',
  Disabled = 'disabled',
}

@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'varchar', default: AdminRole.Operator })
  role: AdminRole;

  @Column({ type: 'varchar', default: AdminStatus.Active })
  status: AdminStatus;

  @Column({ nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
