import {
  Globe,
  Code,
  ShoppingCart,
  Smartphone,
  Package,
  Wrench,
  BookOpen,
  Video,
  Music,
  Palette,
  Users,
  TrendingUp,
  Building2,
  Lightbulb,
  type LucideIcon
} from 'lucide-react';

export const projectTypeIcons: Record<string, LucideIcon> = {
  'Web Application': Globe,
  'Mobile App': Smartphone,
  'E-commerce Platform': ShoppingCart,
  'SaaS Product': Code,
  'API/Backend Service': Package,
  'Desktop Application': Code,
  'DevOps/Infrastructure': Wrench,
  'Content Platform': BookOpen,
  'Video Platform': Video,
  'Music/Audio Platform': Music,
  'Creative Tool': Palette,
  'Social Network': Users,
  'Marketing Campaign': TrendingUp,
  'Business Tool': Building2,
  'Innovation Project': Lightbulb,
};

export function getProjectTypeIcon(projectTypeName: string): LucideIcon {
  return projectTypeIcons[projectTypeName] || Lightbulb;
}
