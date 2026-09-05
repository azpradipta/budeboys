import { cn } from "@/lib/utils";
import type { ConsultationMessage } from "@/lib/types";
import { RiskBadge } from "@/components/shared/status-badge";
import { EvidenceList } from "@/components/shared/evidence-list";
import { Bot, User } from "lucide-react";

export function MessageBubble({ message }: { message: ConsultationMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-2.5", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-secondary text-secondary-foreground" : "bg-primary/10 text-primary"
        )}
      >
        {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
      </div>
      <div className={cn("flex max-w-[80%] flex-col gap-1.5", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2 text-sm",
            isUser
              ? "rounded-tr-sm bg-primary text-primary-foreground"
              : "rounded-tl-sm bg-muted text-foreground"
          )}
        >
          {message.text}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          <span className="text-[11px] text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {message.risk && message.risk !== "LOW_RISK" && <RiskBadge risk={message.risk} />}
        </div>
        {message.evidence && message.evidence.length > 0 && (
          <div className="w-full pt-1">
            <EvidenceList evidence={message.evidence} maxHeightClass="max-h-72" />
          </div>
        )}
      </div>
    </div>
  );
}
