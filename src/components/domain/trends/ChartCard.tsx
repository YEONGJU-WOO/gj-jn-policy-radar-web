"use client";

import { Download } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ChartCard({
  title,
  description,
  actions,
  children,
  onCsv,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  onCsv?: () => void;
}) {
  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {actions}
            {onCsv ? (
              <Button type="button" variant="outline" size="sm" onClick={onCsv}>
                <Download className="h-4 w-4" />
                CSV
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
