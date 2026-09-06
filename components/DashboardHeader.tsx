import React from "react";

interface DashboardHeadlineProps {
  heading: string;
  subHeading: string;
}

export default function DashboardHeadline({
  heading,
  subHeading,
}: DashboardHeadlineProps) {
  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-linear-to-r from-primary via-primary/80 to-accent/60 px-6 py-12 shadow-md md:px-10">
      {/* Ornamen Dekoratif Latar Belakang */}
      <div className="absolute -top-24 -right-16 h-64 w-64 rounded-full bg-white opacity-10 transition-transform duration-700 hover:scale-110"></div>
      <div className="absolute right-12 -bottom-20 h-48 w-48 rounded-full border-16 border-white opacity-10"></div>
      <div className="absolute right-1/4 bottom-8 h-12 w-12 rounded-full bg-white opacity-20 blur-sm"></div>

      {/* Konten Utama */}
      <div className="relative z-10 space-y-2">
        <h2 className="font-heading text-3xl font-bold text-white drop-shadow-sm md:text-4xl">
          {heading}
        </h2>
        <p className="max-w-2xl text-sm text-blue-50 opacity-90 md:text-base">
          {subHeading}
        </p>
      </div>
    </div>
  );
}
