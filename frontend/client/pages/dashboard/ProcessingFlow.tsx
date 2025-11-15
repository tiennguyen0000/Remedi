import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ProcessingStep } from "@shared/dashboardTypes";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProcessingFlowProps {
  steps: ProcessingStep[];
  onStepClick: (step: ProcessingStep) => void;
}

export function ProcessingFlow({ steps, onStepClick }: ProcessingFlowProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quy trình xử lý</CardTitle>
        <CardDescription>
          Theo dõi trạng thái xử lý thuốc của bạn
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Progress Line */}
          <div
            className="absolute top-5 left-5 right-5 h-0.5 bg-muted"
            style={
              {
                background:
                  "linear-gradient(to right, var(--primary) var(--progress), var(--muted) var(--progress))",
                "--progress": `${(steps.filter((s) => s.status === "completed").length / (steps.length - 1)) * 100}%`,
              } as React.CSSProperties
            }
          />

          {/* Steps */}
          <div className="relative flex justify-between">
            {steps.map((step, index) => (
              <TooltipProvider key={step.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="flex flex-col items-center gap-2"
                      onClick={() => onStepClick(step)}
                    >
                      {/* Step Circle */}
                      <div
                        className={cn(
                          "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2",
                          step.status === "completed" &&
                            "border-primary bg-primary text-primary-foreground",
                          step.status === "active" &&
                            "border-primary bg-background text-primary animate-pulse",
                          step.status === "pending" &&
                            "border-muted bg-background text-muted-foreground",
                        )}
                      >
                        {step.count > 0 && (
                          <Badge
                            variant={
                              step.status === "active" ? "default" : "secondary"
                            }
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs"
                          >
                            {step.count}
                          </Badge>
                        )}
                        {index + 1}
                      </div>

                      {/* Step Title */}
                      <div className="text-center">
                        <div className="text-sm font-medium">{step.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {step.description}
                        </div>
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click để xem chi tiết</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
