import { ReactNode } from "react";

export interface Nav {
  title?: string;
  items: NavItem[];
}

export interface NavItem {
  name?: string;
  title?: string;
  url?: string;
  target?: string;
  type?: string;
  icon?: ReactNode;
  is_expand?: boolean;
  is_active?: boolean;
  children?: NavItem[];
}

export interface Button {
  name?: string;
  text?: string;
  icon?: ReactNode;
  url?: string;
  target?: string;
  variant?: "default" | "outline" | "ghost" | "link" | "destructive";
  onClick?: () => void;
}

export interface Image {
  src: string;
  alt?: string;
}

export interface Brand {
  title?: string;
  logo?: Image;
  url?: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
}
