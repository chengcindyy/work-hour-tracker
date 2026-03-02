import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Edit2, Trash2, Plus, Store } from "lucide-react";

export default function ShopsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const { data: shops, isLoading } = trpc.shops.list.useQuery();
  const createShopMutation = trpc.shops.create.useMutation();
  const updateShopMutation = trpc.shops.update.useMutation();
  const deleteShopMutation = trpc.shops.delete.useMutation();
  const utils = trpc.useUtils();

  const handleOpenDialog = (shop?: any) => {
    if (shop) {
      setEditingShop(shop);
      setFormData({ name: shop.name, description: shop.description || "" });
    } else {
      setEditingShop(null);
      setFormData({ name: "", description: "" });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingShop(null);
    setFormData({ name: "", description: "" });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("請輸入店家名稱");
      return;
    }

    try {
      if (editingShop) {
        await updateShopMutation.mutateAsync({
          shopId: editingShop.id,
          name: formData.name,
          description: formData.description,
        });
        toast.success("店家已更新");
      } else {
        await createShopMutation.mutateAsync({
          name: formData.name,
          description: formData.description,
        });
        toast.success("店家已新增");
      }
      utils.shops.list.invalidate();
      handleCloseDialog();
    } catch (error) {
      toast.error("操作失敗，請重試");
    }
  };

  const handleDelete = async (shopId: number) => {
    if (confirm("確定要刪除此店家嗎？")) {
      try {
        await deleteShopMutation.mutateAsync({ shopId });
        toast.success("店家已刪除");
        utils.shops.list.invalidate();
      } catch (error) {
        toast.error("刪除失敗，請重試");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* 標題和按鈕 */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">店家管理</h1>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          新增店家
        </Button>
      </div>

      {/* 店家列表 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="loading-spinner" />
        </div>
      ) : shops && shops.length > 0 ? (
        <div className="grid-auto-fit">
          {shops.map((shop) => (
            <Card key={shop.id} className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Store className="w-8 h-8 text-primary opacity-60" />
                  <div>
                    <h3 className="font-semibold text-foreground">{shop.name}</h3>
                    {shop.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {shop.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDialog(shop)}
                  className="flex-1"
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  編輯
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(shop.id)}
                  className="flex-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  刪除
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="empty-state">
            <Store className="empty-state-icon" />
            <div className="empty-state-title">暫無店家</div>
            <div className="empty-state-description">
              開始新增店家，管理您的工作地點
            </div>
            <Button
              onClick={() => handleOpenDialog()}
              className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              新增店家
            </Button>
          </div>
        </Card>
      )}

      {/* 新增/編輯對話框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingShop ? "編輯店家" : "新增店家"}
            </DialogTitle>
            <DialogDescription>
              {editingShop ? "更新店家信息" : "添加新的工作地點"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label">店家名稱 *</label>
              <Input
                placeholder="例如：美容中心 A"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">描述</label>
              <Textarea
                placeholder="例如：位置、工作時間等"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleCloseDialog}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createShopMutation.isPending || updateShopMutation.isPending}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {editingShop ? "更新" : "新增"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
