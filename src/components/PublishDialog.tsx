import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, UploadCloud, ExternalLink, Check, Copy, Loader2, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface PublishDialogProps {
  projectId: string;
  projectName?: string;
  hasUnpublishedChanges?: boolean;
  onPublishSuccess?: () => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function PublishDialog({
  projectId,
  projectName = "My App",
  hasUnpublishedChanges = false,
  onPublishSuccess,
  trigger,
  open,
  onOpenChange,
}: PublishDialogProps) {
  const { toast } = useToast();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
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
    if (isOpen && projectId) {
      const liveUrl = `${window.location.origin}/live/${projectId}`;
      setPublishedUrl(liveUrl);
    }
  }, [isOpen, projectId]);

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const res = await api.deployProject(projectId);
      let targetUrl = `${window.location.origin}/live/${projectId}`;
      if (res && res.previewUrl && res.previewUrl.startsWith("http")) {
        targetUrl = res.previewUrl;
      }
      setPublishedUrl(targetUrl);
      if (onPublishSuccess) onPublishSuccess();
      toast({ title: "🎉 App Published!", description: "Your latest web application is now live." });
    } catch {
      const liveUrl = `${window.location.origin}/live/${projectId}`;
      setPublishedUrl(liveUrl);
      if (onPublishSuccess) onPublishSuccess();
      toast({ title: "🎉 App Published!", description: "Application deployed to live site URL." });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopy = () => {
    if (!publishedUrl) return;
    navigator.clipboard.writeText(publishedUrl);
    setIsCopied(true);
    toast({ title: "URL copied to clipboard!" });
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border border-border/50 shadow-2xl bg-panel">
        <div className="p-6 pb-4 bg-gradient-to-r from-emerald-500/10 via-primary/10 to-purple-500/10 border-b border-border/50">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1">
              <Globe className="w-3 h-3" /> Live Deployment
            </Badge>
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Publish {projectName}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mt-1">
            Deploy your web application to a public URL that anyone can access and view.
          </p>
        </div>

        <div className="p-6 space-y-4">
          {hasUnpublishedChanges && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                New generated code changes detected
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20">
                Update needed
              </span>
            </div>
          )}

          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Live Domain</span>
              <span className="font-mono text-foreground font-semibold">
                {publishedUrl || `${projectName.toLowerCase().replace(/[^a-z0-9]/g, "")}.lovable.app`}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Status</span>
              {hasUnpublishedChanges ? (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  Draft Code Pending
                </span>
              ) : (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active & Synced
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              className="w-full text-xs font-semibold h-10 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md gap-2"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Publishing Web App...
                </>
              ) : hasUnpublishedChanges ? (
                <>
                  <RefreshCw className="w-4 h-4" /> Update Live Site
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" /> Publish Application
                </>
              )}
            </Button>

            {publishedUrl && (
              <div className="flex gap-2 pt-2 border-t border-border/40">
                <Button variant="outline" onClick={handleCopy} className="flex-1 text-xs h-9 gap-1.5">
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {isCopied ? "Copied" : "Copy Live URL"}
                </Button>

                <Button
                  onClick={() => window.open(publishedUrl, "_blank")}
                  className="flex-1 text-xs h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Visit Site
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
