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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Edit2, Trash2, Plus, Clock } from "lucide-react";
import { format } from "date-fns";

export default function WorkRecordsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [selectedShopId, setSelectedShopId] = useState<string>("");
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<string>("");
  const [formData, setFormData] = useState({
    workDate: format(new Date(), "yyyy-MM-dd"),
    hours: "",
    tips: "",
    notes: "",
  });

  const { data: shops } = trpc.shops.list.useQuery();
  const { data: workRecords, isLoading } = trpc.workRecords.list.useQuery({});
  const { data: serviceTypes } = trpc.serviceTypes.listByShop.useQuery(
    { shopId: parseInt(selectedShopId) },
    { enabled: !!selectedShopId }
  );

  const createRecordMutation = trpc.workRecords.create.useMutation();
  const updateRecordMutation = trpc.workRecords.update.useMutation();
  const deleteRecordMutation = trpc.workRecords.delete.useMutation();
  const utils = trpc.useUtils();

  const handleOpenDialog = (record?: any) => {
    if (record) {
      setEditingRecord(record);
      setSelectedShopId(record.shopId.toString());
      setSelectedServiceTypeId(record.serviceTypeId.toString());
      setFormData({
        workDate: format(new Date(record.workDate), "yyyy-MM-dd"),
        hours: parseFloat(record.hours as any).toString(),
        tips: parseFloat(record.tips as any).toString(),
        notes: record.notes || "",
      });
    } else {
      setEditingRecord(null);
      setSelectedShopId("");
      setSelectedServiceTypeId("");
      setFormData({
        workDate: format(new Date(), "yyyy-MM-dd"),
        hours: "",
        tips: "",
        notes: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRecord(null);
    setSelectedShopId("");
    setSelectedServiceTypeId("");
  };

  const handleSubmit = async () => {
    if (!selectedShopId || !selectedServiceTypeId || !formData.hours) {
      toast.error("請填寫所有必填項目");
      return;
    }

    try {
      const hours = parseFloat(formData.hours);
      const tips = parseFloat(formData.tips) || 0;

      if (editingRecord) {
        await updateRecordMutation.mutateAsync({
          recordId: editingRecord.id,
          shopId: parseInt(selectedShopId),
          serviceTypeId: parseInt(selectedServiceTypeId),
          workDate: new Date(formData.workDate),
          hours,
          tips,
          notes: formData.notes,
        });
        toast.success("工時紀錄已更新");
      } else {
        await createRecordMutation.mutateAsync({
          shopId: parseInt(selectedShopId),
          serviceTypeId: parseInt(selectedServiceTypeId),
          workDate: new Date(formData.workDate),
          hours,
          tips,
          notes: formData.notes,
        });
        toast.success("工時紀錄已新增");
      }
      utils.workRecords.list.invalidate();
      utils.stats.monthlyStats.invalidate();
      handleCloseDialog();
    } catch (error) {
      toast.error("操作失敗，請重試");
    }
  };

  const handleDelete = async (recordId: number) => {
    if (confirm("確定要刪除此工時紀錄嗎？")) {
      try {
        await deleteRecordMutation.mutateAsync({ recordId });
        toast.success("工時紀錄已刪除");
        utils.workRecords.list.invalidate();
        utils.stats.monthlyStats.invalidate();
      } catch (error) {
        toast.error("刪除失敗，請重試");
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("zh-TW", {
      style: "currency",
      currency: "TWD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* 標題和按鈕 */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">工時登記</h1>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          新增工時
        </Button>
      </div>

      {/* 工時紀錄列表 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="loading-spinner" />
        </div>
      ) : workRecords && workRecords.length > 0 ? (
        <div className="space-y-3">
          {workRecords.map((record) => {
            const shop = shops?.find((s) => s.id === record.shopId);
            const serviceType = serviceTypes?.find(
              (st) => st.id === record.serviceTypeId
            );
            return (
              <Card key={record.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">
                      {shop?.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(record.workDate), "yyyy-MM-dd")} • {serviceType?.name}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {parseFloat(record.hours as any).toFixed(1)} 小時 × {formatCurrency(parseFloat(record.hourlyPay as any))}
                    </div>
                  </div>
                  <div className="text-right mr-4">
                    <div className="font-semibold text-primary">
                      {formatCurrency(parseFloat(record.totalEarnings as any))}
                    </div>
                    {parseFloat(record.tips as any) > 0 && (
                      <div className="text-sm text-accent">
                        小費：{formatCurrency(parseFloat(record.tips as any))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(record)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(record.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12">
          <div className="empty-state">
            <Clock className="empty-state-icon" />
            <div className="empty-state-title">暫無工時紀錄</div>
            <div className="empty-state-description">
              開始新增工時紀錄，追蹤您的工作時間
            </div>
            <Button
              onClick={() => handleOpenDialog()}
              className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              新增工時
            </Button>
          </div>
        </Card>
      )}

      {/* 新增/編輯對話框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? "編輯工時紀錄" : "新增工時紀錄"}
            </DialogTitle>
            <DialogDescription>
              {editingRecord ? "更新工時信息" : "記錄您的工作時間和收入"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label">店家 *</label>
              <Select value={selectedShopId} onValueChange={setSelectedShopId}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇店家" />
                </SelectTrigger>
                <SelectContent>
                  {shops?.map((shop) => (
                    <SelectItem key={shop.id} value={shop.id.toString()}>
                      {shop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="form-group">
              <label className="form-label">服務類型 *</label>
              <Select
                value={selectedServiceTypeId}
                onValueChange={setSelectedServiceTypeId}
                disabled={!selectedShopId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇服務類型" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes?.map((st) => (
                    <SelectItem key={st.id} value={st.id.toString()}>
                      {st.name} - {formatCurrency(parseFloat(st.hourlyPay as any))}/小時
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="form-group">
              <label className="form-label">工作日期 *</label>
              <Input
                type="date"
                value={formData.workDate}
                onChange={(e) =>
                  setFormData({ ...formData, workDate: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">時數 *</label>
                <Input
                  type="number"
                  step="0.5"
                  placeholder="0"
                  value={formData.hours}
                  onChange={(e) =>
                    setFormData({ ...formData, hours: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">小費</label>
                <Input
                  type="number"
                  step="10"
                  placeholder="0"
                  value={formData.tips}
                  onChange={(e) =>
                    setFormData({ ...formData, tips: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">備註</label>
              <Textarea
                placeholder="例如：特殊情況、額外說明"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={2}
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
                disabled={
                  createRecordMutation.isPending || updateRecordMutation.isPending
                }
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {editingRecord ? "更新" : "新增"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
