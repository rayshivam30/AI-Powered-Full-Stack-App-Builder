import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link as LinkIcon, Check, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { ProjectMember, ProjectRole } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface ShareDialogProps {
  projectId: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ShareDialog({ projectId, trigger, open, onOpenChange }: ShareDialogProps) {
  const { toast } = useToast();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ProjectRole>("EDITOR");
  const [loading, setLoading] = useState(false);
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
      loadMembers();
    }
  }, [isOpen, projectId]);

  const loadMembers = async () => {
    try {
      const data = await api.getProjectMembers(projectId);
      setMembers(data);
    } catch (error) {
      console.error("Failed to load members", error);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setLoading(true);
    try {
      await api.inviteMember(projectId, inviteEmail.trim(), inviteRole);
      toast({ title: "Invite sent", description: `Invited ${inviteEmail} to the project.` });
      setInviteEmail("");
      loadMembers();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Could not send invitation.";
      toast({ title: "Failed to invite", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: number, newRole: ProjectRole) => {
    try {
      await api.updateMemberRole(projectId, userId, newRole);
      setMembers(members.map((m) => (m.userId === userId ? { ...m, role: newRole } : m)));
      toast({ title: "Role updated" });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to update role.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleRemoveMember = async (userId: number) => {
    try {
      await api.removeMember(projectId, userId);
      setMembers(members.filter((m) => m.userId !== userId));
      toast({ title: "Member removed" });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to remove member.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    toast({ title: "Link copied to clipboard" });
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden border border-border/50 shadow-2xl bg-panel">
        <div className="p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-semibold">Share project</DialogTitle>
          </DialogHeader>

          {/* Invite Section */}
          <div className="space-y-3 mb-6">
            <div className="flex gap-2">
              <Input
                placeholder="Enter user email..."
                className="flex-1 bg-muted/50 border-input/50 text-sm"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              />
              <Select value={inviteRole} onValueChange={(val) => setInviteRole(val as ProjectRole)}>
                <SelectTrigger className="w-[110px] bg-muted/50 border-input/50 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EDITOR">Can edit</SelectItem>
                  <SelectItem value="VIEWER">Can view</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || loading}
                size="sm"
                className="px-4"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Invite"}
              </Button>
            </div>
          </div>

          {/* Members List */}
          <div className="space-y-3 mb-6">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              People with access
            </h4>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {members.length === 0 ? (
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs font-semibold bg-primary/20 text-primary">
                      YOU
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-xs min-w-0">
                    <div className="font-medium">You</div>
                    <div className="text-muted-foreground truncate">Project Owner</div>
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                    Owner
                  </span>
                </div>
              ) : (
                members.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs font-medium bg-muted">
                        {member.name
                          ? member.name.charAt(0).toUpperCase()
                          : member.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-xs">
                      <div className="font-medium truncate">{member.name || member.username}</div>
                      <div className="text-muted-foreground truncate">{member.username}</div>
                    </div>

                    {member.role === "OWNER" ? (
                      <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                        Owner
                      </span>
                    ) : (
                      <Select
                        defaultValue={member.role}
                        onValueChange={(val) => {
                          if (val === "REMOVE") handleRemoveMember(member.userId);
                          else handleRoleChange(member.userId, val as ProjectRole);
                        }}
                      >
                        <SelectTrigger className="h-7 w-[95px] text-xs border-none bg-transparent hover:bg-muted focus:ring-1 shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end">
                          <SelectItem value="EDITOR">Can edit</SelectItem>
                          <SelectItem value="VIEWER">Can view</SelectItem>
                          <SelectItem value="REMOVE" className="text-destructive focus:text-destructive">
                            Remove
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Copy Link Footer */}
          <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground truncate max-w-[240px]">
              Anyone with access can view this project
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="h-8 text-xs gap-1.5 shrink-0"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <LinkIcon className="w-3.5 h-3.5" />
                  Copy link
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
