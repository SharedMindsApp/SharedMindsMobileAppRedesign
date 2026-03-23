import {
  Briefcase,
  User,
  Rocket,
  Heart,
  type LucideIcon
} from 'lucide-react';
import type { DomainName } from '../guardrailsTypes';

export interface DomainConfig {
  name: string;
  icon: LucideIcon;
  colors: {
    primary: string;
    light: string;
    border: string;
    text: string;
    bg: string;
    gradient: string;
  };
}

export const domainConfigs: Record<DomainName, DomainConfig> = {
  work: {
    name: 'Work',
    icon: Briefcase,
    colors: {
      primary: 'bg-blue-600',
      light: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      bg: 'bg-blue-100',
      gradient: 'from-blue-50 to-blue-100',
    },
  },
  personal: {
    name: 'Personal',
    icon: User,
    colors: {
      primary: 'bg-green-600',
      light: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      bg: 'bg-green-100',
      gradient: 'from-green-50 to-green-100',
    },
  },
  creative: {
    name: 'Startup',
    icon: Rocket,
    colors: {
      primary: 'bg-purple-600',
      light: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-700',
      bg: 'bg-purple-100',
      gradient: 'from-purple-50 to-purple-100',
    },
  },
  health: {
    name: 'Health',
    icon: Heart,
    colors: {
      primary: 'bg-red-600',
      light: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      bg: 'bg-red-100',
      gradient: 'from-red-50 to-red-100',
    },
  },
};

export function getDomainConfig(domainName: DomainName): DomainConfig {
  return domainConfigs[domainName];
}
