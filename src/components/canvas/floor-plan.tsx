import { cn } from "@/lib/utils";

interface FloorPlanProps {
  svgUrl: string;
  className?: string;
}

export function FloorPlan({ svgUrl, className }: FloorPlanProps) {
  return (
    <img
      src={svgUrl}
      alt="Facility floor plan"
      data-testid="floor-plan"
      className={cn("w-full h-full object-contain", className)}
      draggable={false}
    />
  );
}
