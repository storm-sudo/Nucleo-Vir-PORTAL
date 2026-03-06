import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Upload, FileText, ShoppingCart, Package, Receipt, Download, 
  CheckCircle, XCircle, Clock, AlertCircle, Eye, Trash2, Plus,
  FileSpreadsheet, TrendingUp, Archive, History, CreditCard, Truck
} from 'lucide-react';
import { BACKEND_URL } from '@/config';

const CA_EMAIL = "nikita@nucleovir.com";
const PROCUREMENT_DIRECTORS = ["yogesh.ostwal@nucleovir.com", "sunil.k@nucleovir.com"];

export default function Procurement() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [accessInfo, setAccessInfo] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [grns, setGrns] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [notifications, setNotifications] = useState([]);
  
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [quotationDialogOpen, setQuotationDialogOpen] = useState(false);
  const [poDialogOpen, setPODialogOpen] = useState(false);
  const [grnDialogOpen, setGrnDialogOpen] = useState(false);
  const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [combinedReportDates, setCombinedReportDates] = useState({
    from_date: new Date().toISOString().slice(0, 8) + '01',
    to_date: new Date().toISOString().slice(0, 10)
  });
  const [combinedReportFormat, setCombinedReportFormat] = useState('xlsx');
  const [downloadingCombined, setDownloadingCombined] = useState(false);
  
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [uploading, setUploading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  
  // Signature-based approval states
  const [signatureFile, setSignatureFile] = useState(null);
  const [signedPOFile, setSignedPOFile] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [uploadingSignedPO, setUploadingSignedPO] = useState(false);
  
  const [quotationForm, setQuotationForm] = useState({
    quotation_no: '', vendor_name: '', category: 'General', gst_pct: 18,
    total_amount: 0, validity_date: '', department: 'Operations', description: ''
  });

  // GRN Form State
  const [grnForm, setGrnForm] = useState({
    po_id: '', qc_status: 'Passed', qc_notes: '', asset_tags: ''
  });
  const [selectedGRN, setSelectedGRN] = useState(null);

  // Voucher Form State
  const [voucherForm, setVoucherForm] = useState({
    grn_id: '', invoice_number: '', invoice_date: '', invoice_amount: 0, tds_pct: 0, payment_mode: 'Bank Transfer'
  });

  // Payment Form State
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    payment_reference: '', payment_date: ''
  });

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    if (accessInfo) {
      fetchData();
    }
  }, [accessInfo]);

  const checkAccess = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/procurement/access`, { credentials: 'include' });
      const data = await response.json();
      setAccessInfo(data);
      
      if (!data.can_access_procurement && !data.is_director) {
        toast.error("You don't have access to the procurement module");
      }
    } catch (error) {
      console.error('Access check failed:', error);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch quotations (only if CA/Admin has access)
      if (accessInfo?.can_access_ca_features) {
        const quoRes = await fetch(`${BACKEND_URL}/api/quotations`, { credentials: 'include' });
        setQuotations(await quoRes.json());
        
        // Fetch POs
        const poRes = await fetch(`${BACKEND_URL}/api/po`, { credentials: 'include' });
        setPurchaseOrders(await poRes.json());
        
        // Fetch GRNs
        const grnRes = await fetch(`${BACKEND_URL}/api/grn`, { credentials: 'include' });
        setGrns(await grnRes.json());
        
        // Fetch vouchers
        const vchRes = await fetch(`${BACKEND_URL}/api/vouchers`, { credentials: 'include' });
        setVouchers(await vchRes.json());
      }
      
      // Fetch pending approvals for directors and admins who can approve
      if (accessInfo?.can_approve || accessInfo?.is_director) {
        const apprRes = await fetch(`${BACKEND_URL}/api/approvals/pending`, { credentials: 'include' });
        setPendingApprovals(await apprRes.json());
      }
      
      // Fetch notifications
      const notifRes = await fetch(`${BACKEND_URL}/api/notifications?unread_only=true`, { credentials: 'include' });
      setNotifications(await notifRes.json());
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'General');
    formData.append('department', 'Operations');
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/quotations/upload`, {
        method: 'POST', credentials: 'include', body: formData
      });
      
      const data = await response.json();
      if (response.ok) {
        setOcrResult(data);
        setQuotationForm({
          quotation_no: data.extracted_fields?.quotation_no?.value || '',
          vendor_name: data.extracted_fields?.vendor_name?.value || '',
          category: 'General',
          gst_pct: data.extracted_fields?.gst_pct?.value || 18,
          total_amount: data.extracted_fields?.total_amount?.value || 0,
          validity_date: data.extracted_fields?.validity_date?.value || '',
          department: 'Operations',
          description: ''
        });
        setSelectedQuotation({ quotation_id: data.quotation_id });
        setQuotationDialogOpen(true);
        toast.success('Quotation uploaded. Please confirm details.');
      } else {
        toast.error(data.detail || 'Upload failed');
      }
    } catch (error) {
      toast.error('Upload error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmQuotation = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/quotations?quotation_id=${selectedQuotation.quotation_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(quotationForm)
      });
      
      if (response.ok) {
        toast.success('Quotation confirmed');
        setQuotationDialogOpen(false);
        setOcrResult(null);
        fetchData();
      } else {
        toast.error('Failed to confirm quotation');
      }
    } catch (error) {
      toast.error('Error');
    }
  };

  const handleGeneratePO = async (quotationId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/po/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ quotation_id: quotationId })
      });
      
      const data = await response.json();
      if (response.ok) {
        toast.success(`PO ${data.po_number} generated`);
        fetchData();
      } else {
        toast.error(data.detail || 'PO generation failed');
      }
    } catch (error) {
      toast.error('Error generating PO');
    }
  };

  const handleDownloadPO = async (poId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/po/${poId}/pdf`, { credentials: 'include' });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PO_${poId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      toast.error('Download failed');
    }
  };

  const handleApprovalDecision = async (decision) => {
    if (!selectedApproval) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/approvals/${selectedApproval.approval_id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          decision,
          comment: document.getElementById('approval-comment')?.value || '',
          approver_email: user.email
        })
      });
      
      if (response.ok) {
        toast.success(`PO ${decision}`);
        setApprovalDialogOpen(false);
        fetchData();
      } else {
        toast.error('Decision failed');
      }
    } catch (error) {
      toast.error('Error');
    }
  };

  // Download PO for signing (approval-based)
  const handleDownloadPOForSigning = async (approvalId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/approvals/${approvalId}/download-po`, { credentials: 'include' });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PO_for_signing.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('PO downloaded for signing');
      } else {
        toast.error('Download failed');
      }
    } catch (error) {
      toast.error('Download error');
    }
  };

  // Upload signature image to approve PO
  const handleUploadSignature = async (approvalId) => {
    if (!signatureFile) {
      toast.error('Please select a signature file');
      return;
    }
    
    setUploadingSignature(true);
    try {
      const formData = new FormData();
      formData.append('signature', signatureFile);
      
      const response = await fetch(`${BACKEND_URL}/api/approvals/${approvalId}/upload-signature`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (response.ok) {
        toast.success('PO approved with your signature!');
        setApprovalDialogOpen(false);
        setSignatureFile(null);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Approval failed');
      }
    } catch (error) {
      toast.error('Error uploading signature');
    }
    setUploadingSignature(false);
  };

  // Upload signed PO document
  const handleUploadSignedPO = async (approvalId) => {
    if (!signedPOFile) {
      toast.error('Please select a signed PO file');
      return;
    }
    
    setUploadingSignedPO(true);
    try {
      const formData = new FormData();
      formData.append('signed_po', signedPOFile);
      
      const response = await fetch(`${BACKEND_URL}/api/approvals/${approvalId}/upload-signed-po`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (response.ok) {
        toast.success('Signed PO uploaded and approved!');
        setApprovalDialogOpen(false);
        setSignedPOFile(null);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Upload failed');
      }
    } catch (error) {
      toast.error('Error uploading signed PO');
    }
    setUploadingSignedPO(false);
  };

  // Reject PO with reason
  const handleRejectPO = async (approvalId) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('reason', rejectionReason);
      
      const response = await fetch(`${BACKEND_URL}/api/approvals/${approvalId}/reject`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (response.ok) {
        toast.success('PO rejected');
        setApprovalDialogOpen(false);
        setRejectionReason('');
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Rejection failed');
      }
    } catch (error) {
      toast.error('Error rejecting PO');
    }
  };

  const handleExportReport = async (reportType, format) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/reports/export?report_type=${reportType}&format=${format}`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}.${format}`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Report downloaded');
      }
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const handleCombinedExport = async () => {
    setDownloadingCombined(true);
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/reports/combined?from_date=${combinedReportDates.from_date}&to_date=${combinedReportDates.to_date}&format=${combinedReportFormat}`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reports_PO_Payment_Vendor_GSTTDS_${combinedReportDates.from_date}_${combinedReportDates.to_date}.${combinedReportFormat}`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Combined report downloaded successfully');
      } else {
        toast.error('Failed to generate combined report');
      }
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setDownloadingCombined(false);
    }
  };

  // GRN Creation
  const handleCreateGRN = async () => {
    if (!selectedPO) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/grn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          po_id: selectedPO.po_id,
          received_items: selectedPO.items || [{ description: 'All items as per PO', quantity: 1 }],
          qc_status: grnForm.qc_status,
          qc_notes: grnForm.qc_notes,
          asset_tags: grnForm.asset_tags ? grnForm.asset_tags.split(',').map(t => t.trim()) : []
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        toast.success(`GRN ${data.grn_number} created`);
        setGrnDialogOpen(false);
        setSelectedPO(null);
        setGrnForm({ po_id: '', qc_status: 'Passed', qc_notes: '', asset_tags: '' });
        fetchData();
      } else {
        toast.error(data.detail || 'GRN creation failed');
      }
    } catch (error) {
      toast.error('Error creating GRN');
    }
  };

  // Voucher Creation
  const handleCreateVoucher = async () => {
    if (!selectedGRN) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/vouchers/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          grn_id: selectedGRN.grn_id,
          invoice_number: voucherForm.invoice_number,
          invoice_date: voucherForm.invoice_date,
          invoice_amount: parseFloat(voucherForm.invoice_amount),
          tds_pct: parseFloat(voucherForm.tds_pct) || 0,
          payment_mode: voucherForm.payment_mode
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        toast.success(`Voucher ${data.voucher_number} created`);
        setVoucherDialogOpen(false);
        setSelectedGRN(null);
        setVoucherForm({ grn_id: '', invoice_number: '', invoice_date: '', invoice_amount: 0, tds_pct: 0, payment_mode: 'Bank Transfer' });
        fetchData();
      } else {
        toast.error(data.detail || 'Voucher creation failed');
      }
    } catch (error) {
      toast.error('Error creating voucher');
    }
  };

  // Mark Voucher as Paid
  const handleMarkPaid = async () => {
    if (!selectedVoucher) return;
    
    const formData = new FormData();
    formData.append('payment_reference', paymentForm.payment_reference);
    formData.append('payment_date', paymentForm.payment_date);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/vouchers/${selectedVoucher.voucher_id}/mark-paid`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (response.ok) {
        toast.success('Payment recorded');
        setPaymentDialogOpen(false);
        setSelectedVoucher(null);
        setPaymentForm({ payment_reference: '', payment_date: '' });
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to record payment');
      }
    } catch (error) {
      toast.error('Error recording payment');
    }
  };

  // Approve Voucher
  const handleApproveVoucher = async (voucherId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/vouchers/${voucherId}/approve`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        toast.success('Voucher approved');
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Approval failed');
      }
    } catch (error) {
      toast.error('Error approving voucher');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      converted_to_po: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      pending_approval: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      goods_received: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
      pending_review: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    };
    return styles[status] || styles.draft;
  };

  // Access denied for non-CA, non-Admin, and non-Directors
  if (accessInfo && !accessInfo.can_access_procurement && !accessInfo.is_director && !accessInfo.can_approve) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 max-w-md">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
            <p className="text-gray-600 dark:text-slate-400">
              You don't have permission to access the Procurement module.
              Only CA ({CA_EMAIL}), Directors, and Admins can access this section.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Director-Only View (not CA, not Admin) - Show only Approval Queue
  const isDirectorOnly = accessInfo?.is_director && !accessInfo?.can_access_ca_features;

  if (isDirectorOnly) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-white">Procurement</h1>
            <p className="text-gray-600 dark:text-slate-400">
              Director Approvals Dashboard - Review and approve POs
            </p>
          </div>
          
          {/* Notifications Badge */}
          {notifications.length > 0 && (
            <Badge className="bg-red-500 text-white">{notifications.length} new notifications</Badge>
          )}
        </div>

        {/* Director Approval Queue */}
        <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
          <CardHeader className="border-b border-gray-200 dark:border-slate-700">
            <CardTitle className="text-xl font-heading text-gray-900 dark:text-white flex items-center">
              <Clock className="h-6 w-6 mr-3 text-amber-500" />
              Approval Queue
              {pendingApprovals.length > 0 && (
                <Badge className="ml-3 bg-amber-500 text-white">{pendingApprovals.length} pending</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {pendingApprovals.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">All Caught Up!</h3>
                <p className="text-gray-600 dark:text-slate-400">No pending approvals at this time.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingApprovals.map(approval => (
                  <div key={approval.approval_id} className="flex justify-between items-center p-5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-700/50 dark:to-slate-700/30 rounded-xl border border-amber-200 dark:border-slate-600 hover:shadow-md transition-shadow">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="h-5 w-5 text-amber-600" />
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {approval.po_details?.po_number}
                        </span>
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          {approval.po_details?.status?.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-slate-400">Vendor:</span>
                          <span className="ml-2 text-gray-900 dark:text-white font-medium">{approval.po_details?.vendor_name}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-slate-400">Amount:</span>
                          <span className="ml-2 text-gray-900 dark:text-white font-medium">₹{approval.po_details?.total_amount?.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-slate-400">Category:</span>
                          <span className="ml-2 text-gray-900 dark:text-white font-medium">{approval.po_details?.category}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                        Created: {approval.po_details?.created_at?.slice(0, 10)} by {approval.po_details?.created_by}
                      </div>
                    </div>
                    <Button
                      onClick={() => { setSelectedApproval(approval); setApprovalDialogOpen(true); }}
                      className="ml-4 bg-gradient-to-r from-[#FF3D33] to-[#215F9A] hover:from-[#e63529] hover:to-[#1a4d7a] text-white px-6"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Review & Decide
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approval Dialog - Signature Based */}
        <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
          <DialogContent className="max-w-2xl bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#215F9A]" />
                Review & Sign PO: {selectedApproval?.po_details?.po_number}
              </DialogTitle>
            </DialogHeader>
            {selectedApproval && (
              <div className="space-y-6">
                {/* PO Details */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-slate-400">Vendor</label>
                    <div className="font-medium text-gray-900 dark:text-white">{selectedApproval.po_details?.vendor_name}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-slate-400">Amount</label>
                    <div className="font-medium text-gray-900 dark:text-white">₹{selectedApproval.po_details?.total_amount?.toLocaleString()}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-slate-400">Category</label>
                    <div className="font-medium text-gray-900 dark:text-white">{selectedApproval.po_details?.category}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-slate-400">Department</label>
                    <div className="font-medium text-gray-900 dark:text-white">{selectedApproval.po_details?.department}</div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm text-gray-500 dark:text-slate-400">GST Breakdown</label>
                    <div className="font-medium text-gray-900 dark:text-white">
                      Subtotal: ₹{selectedApproval.po_details?.subtotal?.toLocaleString()} + GST ({selectedApproval.po_details?.gst_pct}%): ₹{selectedApproval.po_details?.gst_amount?.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Step 1: Download PO */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
                    <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 text-sm">1</span>
                    Download PO for Signing
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                    Download the PO document to review and add your signature.
                  </p>
                  <Button
                    onClick={() => handleDownloadPOForSigning(selectedApproval.approval_id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PO PDF
                  </Button>
                </div>

                {/* Step 2: Upload Options */}
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <h4 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-2 flex items-center">
                    <span className="bg-emerald-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 text-sm">2</span>
                    Upload Signature / Signed PO
                  </h4>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-3">
                    Choose one of the options below to approve the PO:
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Option A: Upload Signature Image */}
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border-2 border-dashed border-emerald-300 dark:border-emerald-700">
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2 text-sm">Option A: Upload Signature</h5>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
                        Upload your signature image (PNG, JPG) and it will be applied to the PO automatically.
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setSignatureFile(e.target.files[0])}
                        className="text-xs w-full"
                      />
                      {signatureFile && (
                        <Button
                          onClick={() => handleUploadSignature(selectedApproval.approval_id)}
                          className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                          disabled={uploadingSignature}
                        >
                          {uploadingSignature ? 'Uploading...' : 'Apply Signature & Approve'}
                        </Button>
                      )}
                    </div>

                    {/* Option B: Upload Signed PO */}
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border-2 border-dashed border-emerald-300 dark:border-emerald-700">
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2 text-sm">Option B: Upload Signed PO</h5>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
                        Upload the physically signed PO document (PDF, JPG, PNG).
                      </p>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={(e) => setSignedPOFile(e.target.files[0])}
                        className="text-xs w-full"
                      />
                      {signedPOFile && (
                        <Button
                          onClick={() => handleUploadSignedPO(selectedApproval.approval_id)}
                          className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                          disabled={uploadingSignedPO}
                        >
                          {uploadingSignedPO ? 'Uploading...' : 'Upload & Approve'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Reject Option */}
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">Reject PO</h4>
                  <Textarea
                    placeholder="Enter rejection reason..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 mb-3"
                    rows={2}
                  />
                  <Button
                    onClick={() => handleRejectPO(selectedApproval.approval_id)}
                    variant="destructive"
                    disabled={!rejectionReason.trim()}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject PO
                  </Button>
                </div>

                {/* Close Button */}
                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-700">
                  <Button
                    onClick={() => {
                      setApprovalDialogOpen(false);
                      setSignatureFile(null);
                      setSignedPOFile(null);
                      setRejectionReason('');
                    }}
                    variant="outline"
                    className="border-gray-300 dark:border-slate-600"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // CA/Admin View - Full Dashboard
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-white">Procurement</h1>
          <p className="text-gray-600 dark:text-slate-400">
            {accessInfo?.is_ca ? 'CA Dashboard - Manage quotations, POs, and payments' : 'Admin Dashboard - Full Procurement Access'}
          </p>
        </div>
        
        {/* Notifications Badge */}
        {notifications.length > 0 && (
          <Badge className="bg-red-500 text-white">{notifications.length} new notifications</Badge>
        )}
      </div>

      {/* Pending Approvals for Admin/CA who are also Directors */}
      {accessInfo?.can_approve && pendingApprovals.length > 0 && (
        <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 border-l-4 border-l-amber-500">
          <CardHeader>
            <CardTitle className="text-lg font-heading text-gray-900 dark:text-white flex items-center">
              <Clock className="h-5 w-5 mr-2 text-amber-500" />
              Pending Approvals ({pendingApprovals.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingApprovals.map(approval => (
              <div key={approval.approval_id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    PO: {approval.po_details?.po_number}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">
                    {approval.po_details?.vendor_name} • ₹{approval.po_details?.total_amount?.toLocaleString()}
                  </div>
                </div>
                <Button
                  onClick={() => { setSelectedApproval(approval); setApprovalDialogOpen(true); }}
                  className="bg-gradient-to-r from-[#FF3D33] to-[#215F9A] text-white"
                >
                  Review
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* CA/Admin View - Full Dashboard with Tabs */}
      <Tabs defaultValue="quotations" className="space-y-6">
        <TabsList className="bg-gray-100 dark:bg-slate-800">
          <TabsTrigger value="quotations">Quotations</TabsTrigger>
          <TabsTrigger value="po">Purchase Orders</TabsTrigger>
          <TabsTrigger value="grn">GRN</TabsTrigger>
          <TabsTrigger value="vouchers">Vouchers</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

          {/* Quotations Tab */}
          <TabsContent value="quotations" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-heading font-semibold text-gray-900 dark:text-white">Quotations</h2>
              <div className="flex gap-2">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.jpg,.png" className="hidden" />
                <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="bg-gradient-to-r from-[#FF3D33] to-[#215F9A] text-white">
                  <Upload className="h-4 w-4 mr-2" />{uploading ? 'Uploading...' : 'Upload Quotation'}
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              {quotations.map(quo => (
                <Card key={quo.quotation_id} className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                  <CardContent className="py-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{quo.quotation_no}</div>
                        <div className="text-sm text-gray-600 dark:text-slate-400">{quo.vendor_name}</div>
                        <div className="text-sm text-gray-500 dark:text-slate-500">₹{quo.total_amount?.toLocaleString()} • {quo.category}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusBadge(quo.status)}>{quo.status}</Badge>
                        {quo.status === 'confirmed' && (
                          <Button size="sm" onClick={() => handleGeneratePO(quo.quotation_id)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            Generate PO
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {quotations.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No quotations yet. Upload your first quotation.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Purchase Orders Tab */}
          <TabsContent value="po" className="space-y-4">
            <h2 className="text-xl font-heading font-semibold text-gray-900 dark:text-white">Purchase Orders</h2>
            
            <div className="grid gap-4">
              {purchaseOrders.map(po => (
                <Card key={po.po_id} className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                  <CardContent className="py-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{po.po_number}</div>
                        <div className="text-sm text-gray-600 dark:text-slate-400">{po.vendor_name}</div>
                        <div className="text-sm text-gray-500 dark:text-slate-500">₹{po.total_amount?.toLocaleString()} • {po.created_at?.slice(0, 10)}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <Badge className={getStatusBadge(po.status)}>{po.status?.replace(/_/g, ' ')}</Badge>
                        <Button size="sm" variant="outline" onClick={() => handleDownloadPO(po.po_id)} className="border-gray-300 dark:border-slate-600" title="Download PDF">
                          <Download className="h-4 w-4" />
                        </Button>
                        {po.status === 'approved' && (
                          <Button 
                            size="sm" 
                            onClick={() => { setSelectedPO(po); setGrnDialogOpen(true); }}
                            className="bg-teal-600 hover:bg-teal-700 text-white"
                          >
                            <Truck className="h-4 w-4 mr-1" />Create GRN
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {purchaseOrders.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No purchase orders yet.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* GRN Tab */}
          <TabsContent value="grn" className="space-y-4">
            <h2 className="text-xl font-heading font-semibold text-gray-900 dark:text-white">Goods Receipt Notes</h2>
            
            <div className="grid gap-4">
              {grns.map(grn => (
                <Card key={grn.grn_id} className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                  <CardContent className="py-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{grn.grn_number}</div>
                        <div className="text-sm text-gray-600 dark:text-slate-400">PO: {grn.po_number} • Vendor: {grn.vendor_name}</div>
                        <div className="text-sm text-gray-500 dark:text-slate-500">QC: {grn.qc_status} {grn.qc_notes ? `- ${grn.qc_notes}` : ''}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <Badge className={getStatusBadge(grn.status)}>{grn.status}</Badge>
                        {grn.status === 'received' && !vouchers.some(v => v.grn_id === grn.grn_id) && (
                          <Button 
                            size="sm" 
                            onClick={() => { setSelectedGRN(grn); setVoucherDialogOpen(true); }}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                          >
                            <Receipt className="h-4 w-4 mr-1" />Create Voucher
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {grns.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No GRNs yet.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Vouchers Tab */}
          <TabsContent value="vouchers" className="space-y-4">
            <h2 className="text-xl font-heading font-semibold text-gray-900 dark:text-white">Payment Vouchers</h2>
            
            <div className="grid gap-4">
              {vouchers.map(vch => (
                <Card key={vch.voucher_id} className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                  <CardContent className="py-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{vch.voucher_number}</div>
                        <div className="text-sm text-gray-600 dark:text-slate-400">{vch.vendor_name} • Invoice: {vch.invoice_number}</div>
                        <div className="text-sm text-gray-500 dark:text-slate-500">
                          Amount: ₹{vch.invoice_amount?.toLocaleString()} | TDS: ₹{vch.tds_amount?.toLocaleString()} | Net: ₹{vch.net_payable?.toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <Badge className={getStatusBadge(vch.status)}>{vch.status?.replace(/_/g, ' ')}</Badge>
                        <Badge className={getStatusBadge(vch.payment_status)}>{vch.payment_status}</Badge>
                        {vch.status === 'pending_review' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleApproveVoucher(vch.voucher_id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />Approve
                          </Button>
                        )}
                        {vch.status === 'approved' && vch.payment_status === 'unpaid' && (
                          <Button 
                            size="sm" 
                            onClick={() => { setSelectedVoucher(vch); setPaymentDialogOpen(true); }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CreditCard className="h-4 w-4 mr-1" />Mark Paid
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {vouchers.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No vouchers yet.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <h2 className="text-xl font-heading font-semibold text-gray-900 dark:text-white">Reports Export</h2>
            
            {/* Combined Report Section */}
            <Card className="bg-gradient-to-r from-[#215F9A]/10 to-[#FF3D33]/10 border-[#215F9A]/30 dark:border-[#215F9A]/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <Archive className="h-5 w-5 text-[#215F9A]" />
                  Download Combined Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Generate a consolidated report containing PO Register, Payment Register, Vendor Aging, and GST/TDS Summary.
                </p>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">From Date</label>
                    <Input 
                      type="date" 
                      value={combinedReportDates.from_date}
                      onChange={(e) => setCombinedReportDates({...combinedReportDates, from_date: e.target.value})}
                      className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">To Date</label>
                    <Input 
                      type="date"
                      value={combinedReportDates.to_date}
                      onChange={(e) => setCombinedReportDates({...combinedReportDates, to_date: e.target.value})}
                      className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Format</label>
                    <Select value={combinedReportFormat} onValueChange={setCombinedReportFormat}>
                      <SelectTrigger className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800">
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button 
                  onClick={handleCombinedExport}
                  disabled={downloadingCombined}
                  className="w-full sm:w-auto bg-gradient-to-r from-[#FF3D33] to-[#215F9A] hover:from-[#e63529] hover:to-[#1a4d7a] text-white"
                >
                  {downloadingCombined ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download Combined Report
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
            
            {/* Individual Reports */}
            <h3 className="text-lg font-medium text-gray-800 dark:text-slate-200 pt-2">Individual Reports</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { type: 'po_register', label: 'PO Register', icon: FileSpreadsheet },
                { type: 'payment_register', label: 'Payment Register', icon: Receipt },
                { type: 'vendor_aging', label: 'Vendor Aging', icon: TrendingUp },
                { type: 'gst_tds', label: 'GST/TDS Report', icon: FileText },
              ].map(report => (
                <Card key={report.type} className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                  <CardContent className="py-6 text-center">
                    <report.icon className="h-8 w-8 mx-auto mb-3 text-[#215F9A]" />
                    <div className="font-medium text-gray-900 dark:text-white mb-3">{report.label}</div>
                    <div className="flex gap-2 justify-center">
                      <Button size="sm" variant="outline" onClick={() => handleExportReport(report.type, 'csv')} className="border-gray-300 dark:border-slate-600">CSV</Button>
                      <Button size="sm" variant="outline" onClick={() => handleExportReport(report.type, 'xlsx')} className="border-gray-300 dark:border-slate-600">Excel</Button>
                      <Button size="sm" variant="outline" onClick={() => handleExportReport(report.type, 'pdf')} className="border-gray-300 dark:border-slate-600">PDF</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

      {/* Quotation Confirmation Dialog */}
      <Dialog open={quotationDialogOpen} onOpenChange={setQuotationDialogOpen}>
        <DialogContent className="max-w-lg bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Confirm Quotation Details</DialogTitle>
          </DialogHeader>
          {ocrResult?.needs_confirmation && (
            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800 mb-4">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                OCR confidence is low. Please verify extracted fields.
              </p>
            </div>
          )}
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Quotation No</label><Input value={quotationForm.quotation_no} onChange={(e) => setQuotationForm({...quotationForm, quotation_no: e.target.value})} className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Vendor Name</label><Input value={quotationForm.vendor_name} onChange={(e) => setQuotationForm({...quotationForm, vendor_name: e.target.value})} className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Category</label>
                <Select value={quotationForm.category} onValueChange={(v) => setQuotationForm({...quotationForm, category: v})}>
                  <SelectTrigger className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800"><SelectItem value="General">General</SelectItem><SelectItem value="Lab Equipment">Lab Equipment</SelectItem><SelectItem value="Chemicals">Chemicals</SelectItem><SelectItem value="IT">IT</SelectItem><SelectItem value="Services">Services</SelectItem></SelectContent>
                </Select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">GST %</label><Input type="number" value={quotationForm.gst_pct} onChange={(e) => setQuotationForm({...quotationForm, gst_pct: parseFloat(e.target.value)})} className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Total Amount (₹)</label><Input type="number" value={quotationForm.total_amount} onChange={(e) => setQuotationForm({...quotationForm, total_amount: parseFloat(e.target.value)})} className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Validity Date</label><Input type="date" value={quotationForm.validity_date} onChange={(e) => setQuotationForm({...quotationForm, validity_date: e.target.value})} className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white" /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Department</label>
              <Select value={quotationForm.department} onValueChange={(v) => setQuotationForm({...quotationForm, department: v})}>
                <SelectTrigger className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800"><SelectItem value="Operations">Operations</SelectItem><SelectItem value="Research">Research</SelectItem><SelectItem value="Admin">Admin</SelectItem><SelectItem value="IT">IT</SelectItem></SelectContent>
              </Select>
            </div>
            <Button onClick={handleConfirmQuotation} className="w-full bg-gradient-to-r from-[#FF3D33] to-[#215F9A] text-white">Confirm & Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approval Decision Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent className="max-w-lg bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Review Purchase Order</DialogTitle>
          </DialogHeader>
          {selectedApproval && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500 dark:text-slate-400">PO Number:</div>
                  <div className="font-medium text-gray-900 dark:text-white">{selectedApproval.po_details?.po_number}</div>
                  <div className="text-gray-500 dark:text-slate-400">Vendor:</div>
                  <div className="font-medium text-gray-900 dark:text-white">{selectedApproval.po_details?.vendor_name}</div>
                  <div className="text-gray-500 dark:text-slate-400">Amount:</div>
                  <div className="font-medium text-gray-900 dark:text-white">₹{selectedApproval.po_details?.total_amount?.toLocaleString()}</div>
                  <div className="text-gray-500 dark:text-slate-400">Category:</div>
                  <div className="font-medium text-gray-900 dark:text-white">{selectedApproval.po_details?.category}</div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Comment</label>
                <Textarea id="approval-comment" placeholder="Add your comment..." className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white" />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleApprovalDecision('approved')} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <CheckCircle className="h-4 w-4 mr-2" />Approve
                </Button>
                <Button onClick={() => handleApprovalDecision('rejected')} variant="destructive" className="flex-1">
                  <XCircle className="h-4 w-4 mr-2" />Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* GRN Creation Dialog */}
      <Dialog open={grnDialogOpen} onOpenChange={setGrnDialogOpen}>
        <DialogContent className="max-w-lg bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Create Goods Receipt Note</DialogTitle>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500 dark:text-slate-400">PO Number:</div>
                  <div className="font-medium text-gray-900 dark:text-white">{selectedPO.po_number}</div>
                  <div className="text-gray-500 dark:text-slate-400">Vendor:</div>
                  <div className="font-medium text-gray-900 dark:text-white">{selectedPO.vendor_name}</div>
                  <div className="text-gray-500 dark:text-slate-400">Amount:</div>
                  <div className="font-medium text-gray-900 dark:text-white">₹{selectedPO.total_amount?.toLocaleString()}</div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">QC Status</label>
                <Select value={grnForm.qc_status} onValueChange={(v) => setGrnForm({...grnForm, qc_status: v})}>
                  <SelectTrigger className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800">
                    <SelectItem value="Passed">Passed</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                    <SelectItem value="Partial">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">QC Notes</label>
                <Textarea 
                  value={grnForm.qc_notes} 
                  onChange={(e) => setGrnForm({...grnForm, qc_notes: e.target.value})}
                  placeholder="Any observations during quality check..."
                  className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Asset Tags (comma-separated)</label>
                <Input 
                  value={grnForm.asset_tags} 
                  onChange={(e) => setGrnForm({...grnForm, asset_tags: e.target.value})}
                  placeholder="e.g., ASSET-001, ASSET-002"
                  className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                />
              </div>
              <Button onClick={handleCreateGRN} className="w-full bg-gradient-to-r from-[#FF3D33] to-[#215F9A] text-white">
                <Truck className="h-4 w-4 mr-2" />Create GRN
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Voucher Creation Dialog */}
      <Dialog open={voucherDialogOpen} onOpenChange={setVoucherDialogOpen}>
        <DialogContent className="max-w-lg bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Create Payment Voucher</DialogTitle>
          </DialogHeader>
          {selectedGRN && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500 dark:text-slate-400">GRN Number:</div>
                  <div className="font-medium text-gray-900 dark:text-white">{selectedGRN.grn_number}</div>
                  <div className="text-gray-500 dark:text-slate-400">PO Number:</div>
                  <div className="font-medium text-gray-900 dark:text-white">{selectedGRN.po_number}</div>
                  <div className="text-gray-500 dark:text-slate-400">Vendor:</div>
                  <div className="font-medium text-gray-900 dark:text-white">{selectedGRN.vendor_name}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Invoice Number</label>
                  <Input 
                    value={voucherForm.invoice_number} 
                    onChange={(e) => setVoucherForm({...voucherForm, invoice_number: e.target.value})}
                    placeholder="INV-001"
                    className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Invoice Date</label>
                  <Input 
                    type="date"
                    value={voucherForm.invoice_date} 
                    onChange={(e) => setVoucherForm({...voucherForm, invoice_date: e.target.value})}
                    className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Invoice Amount (₹)</label>
                  <Input 
                    type="number"
                    value={voucherForm.invoice_amount} 
                    onChange={(e) => setVoucherForm({...voucherForm, invoice_amount: e.target.value})}
                    className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">TDS %</label>
                  <Input 
                    type="number"
                    value={voucherForm.tds_pct} 
                    onChange={(e) => setVoucherForm({...voucherForm, tds_pct: e.target.value})}
                    placeholder="0"
                    className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Payment Mode</label>
                <Select value={voucherForm.payment_mode} onValueChange={(v) => setVoucherForm({...voucherForm, payment_mode: v})}>
                  <SelectTrigger className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800">
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateVoucher} className="w-full bg-gradient-to-r from-[#FF3D33] to-[#215F9A] text-white">
                <Receipt className="h-4 w-4 mr-2" />Create Voucher
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mark Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Record Payment</DialogTitle>
          </DialogHeader>
          {selectedVoucher && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500 dark:text-slate-400">Voucher:</div>
                  <div className="font-medium text-gray-900 dark:text-white">{selectedVoucher.voucher_number}</div>
                  <div className="text-gray-500 dark:text-slate-400">Vendor:</div>
                  <div className="font-medium text-gray-900 dark:text-white">{selectedVoucher.vendor_name}</div>
                  <div className="text-gray-500 dark:text-slate-400">Net Payable:</div>
                  <div className="font-medium text-emerald-600 dark:text-emerald-400">₹{selectedVoucher.net_payable?.toLocaleString()}</div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Payment Reference</label>
                <Input 
                  value={paymentForm.payment_reference} 
                  onChange={(e) => setPaymentForm({...paymentForm, payment_reference: e.target.value})}
                  placeholder="e.g., NEFT/UTR number"
                  className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Payment Date</label>
                <Input 
                  type="date"
                  value={paymentForm.payment_date} 
                  onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
                  className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                />
              </div>
              <Button onClick={handleMarkPaid} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                <CreditCard className="h-4 w-4 mr-2" />Confirm Payment
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
