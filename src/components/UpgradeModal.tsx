import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, Zap, Shield, Crown, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Plan {
  id: number;
  name: string;
  maxProjects?: number;
  maxTokensPerDay?: number;
  unlimitedAi?: boolean;
  price?: string;
}

interface UpgradeModalProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DEFAULT_PLANS: Plan[] = [
  {
    id: 1,
    name: "Free",
    maxProjects: 3,
    maxTokensPerDay: 50000,
    unlimitedAi: false,
    price: "$0",
  },
  {
    id: 2,
    name: "Pro",
    maxProjects: 999,
    maxTokensPerDay: 1000000,
    unlimitedAi: true,
    price: "$20",
  },
];

export function UpgradeModal({ trigger, open, onOpenChange }: UpgradeModalProps) {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [loadingPlanId, setLoadingPlanId] = useState<number | null>(null);
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = open !== undefined ? open : internalOpen;
  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPlans();
    }
  }, [isOpen]);

  const loadPlans = async () => {
    try {
      const data = await api.getPlans();
      if (Array.isArray(data) && data.length > 0) {
        setPlans(data);
      }
    } catch {
      // Fallback to default plans if backend offline
    }
  };

  const handleCheckout = async (planId: number) => {
    setLoadingPlanId(planId);
    try {
      const res = await api.createCheckoutSession(planId);
      if (res && res.checkoutUrl) {
        toast({ title: "Redirecting to Checkout", description: "Opening Stripe Payment Portal..." });
        window.location.href = res.checkoutUrl;
      } else {
        toast({ title: "Pro Plan Unlocked", description: "Your account has been upgraded!" });
        handleOpenChange(false);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to launch payment checkout.";
      toast({ title: "Upgrade Notice", description: msg || "Checkout portal initialized.", variant: "destructive" });
    } finally {
      setLoadingPlanId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border border-border/50 shadow-2xl bg-panel">
        <div className="p-6 pb-4 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-primary/10 border-b border-border/50">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 gap-1">
              <Crown className="w-3 h-3" /> Pro Tier
            </Badge>
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
              Supercharge your App Development
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mt-1">
            Unlock unlimited AI generations, high-speed LLM reasoning, live Sandpack compilation, and team sharing.
          </p>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Free Tier */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">Starter Free</h3>
                  <p className="text-xs text-muted-foreground">For exploring & small demos</p>
                </div>
                <span className="text-xl font-bold text-foreground">$0</span>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground my-4">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Up to 3 active projects
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Standard AI generation speed
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> In-Browser Sandbox Preview
                </li>
              </ul>
            </div>
            <Button variant="outline" disabled className="w-full text-xs h-9">
              Current Plan
            </Button>
          </div>

          {/* Pro Tier */}
          <div className="rounded-xl border-2 border-primary/50 bg-primary/5 p-5 flex flex-col justify-between relative overflow-hidden shadow-lg shadow-primary/10">
            <div className="absolute top-3 right-3">
              <Badge className="bg-primary text-primary-foreground text-[10px] uppercase font-bold tracking-wider">
                Popular
              </Badge>
            </div>
            <div>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-1.5">
                    Pro Builder <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-current" />
                  </h3>
                  <p className="text-xs text-muted-foreground">For creators & full apps</p>
                </div>
                <span className="text-xl font-bold text-foreground">$20 <span className="text-xs font-normal text-muted-foreground">/mo</span></span>
              </div>
              <ul className="space-y-2 text-xs text-foreground/90 my-4">
                <li className="flex items-center gap-2 font-medium">
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Unlimited AI Generations
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Shield className="w-3.5 h-3.5 text-purple-400 shrink-0" /> Priority High-Speed LLM Queue
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Full Sandpack Live Preview Engine
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> One-Click Code ZIP Export
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Team Collaboration & Multi-User Sharing
                </li>
              </ul>
            </div>
            <Button
              onClick={() => handleCheckout(plans.find((p) => p.name.toLowerCase() === "pro")?.id || 2)}
              disabled={loadingPlanId !== null}
              className="w-full text-xs font-semibold h-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
            >
              {loadingPlanId !== null ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 mr-1.5 fill-current" />
              )}
              Upgrade to Pro
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
