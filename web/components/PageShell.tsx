"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ index, children, className }: { index: number; children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3), ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`card animate-pulse p-6 ${className}`}>
      <div className="skeleton h-5 w-2/3 rounded-lg" />
      <div className="skeleton mt-3 h-4 w-full rounded-lg" />
      <div className="skeleton mt-2 h-4 w-5/6 rounded-lg" />
      <div className="mt-4 flex gap-2">
        <div className="skeleton h-6 w-16 rounded-full" />
        <div className="skeleton h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}
