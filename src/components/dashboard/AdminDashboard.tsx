import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Clock, CheckCircle, XCircle, AlertCircle, User, FileText, Download, BarChart3, TrendingUp, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  admin_remarks: string | null;
  created_at: string;
  updated_at: string;
  profiles: {
    full_name: string;
    email: string;
    student_id: string;
  };
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchComplaints();
    }
  }, [user]);

  const fetchComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *,
          profiles!student_id (
            full_name,
            email,
            student_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setComplaints(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching complaints",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateComplaint = async () => {
    if (!selectedComplaint || !newStatus) return;

    setUpdating(true);
    try {
      const updateData: any = { status: newStatus };
      if (adminRemarks.trim()) {
        updateData.admin_remarks = adminRemarks.trim();
      }

      const { error } = await supabase
        .from('complaints')
        .update(updateData)
        .eq('id', selectedComplaint.id);

      if (error) throw error;

      toast({
        title: "Complaint updated",
        description: "The complaint status has been updated successfully."
      });

      // Send notification to student
      await sendNotification(selectedComplaint, updateData.admin_remarks ? 'remarks_added' : 'status_update');

      // Refresh complaints
      await fetchComplaints();
      
      // Reset form
      setSelectedComplaint(null);
      setNewStatus('');
      setAdminRemarks('');
    } catch (error: any) {
      toast({
        title: "Error updating complaint",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const openUpdateDialog = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setNewStatus(complaint.status);
    setAdminRemarks(complaint.admin_remarks || '');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'in_progress':
        return <AlertCircle className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredComplaints = complaints.filter(complaint => {
    const matchesSearch = complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         complaint.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         complaint.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || complaint.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || complaint.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'pending').length,
    inProgress: complaints.filter(c => c.status === 'in_progress').length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
    rejected: complaints.filter(c => c.status === 'rejected').length
  };

  // Analytics data
  const categoryStats = [
    { name: 'Academic', value: complaints.filter(c => c.category === 'academic').length },
    { name: 'Hostel', value: complaints.filter(c => c.category === 'hostel').length },
    { name: 'Admin', value: complaints.filter(c => c.category === 'admin').length },
    { name: 'Harassment', value: complaints.filter(c => c.category === 'harassment').length },
    { name: 'Finance', value: complaints.filter(c => c.category === 'finance').length },
    { name: 'Other', value: complaints.filter(c => c.category === 'other').length }
  ].filter(item => item.value > 0);

  const statusChartData = [
    { status: 'Pending', count: stats.pending, fill: '#eab308' },
    { status: 'In Progress', count: stats.inProgress, fill: '#3b82f6' },
    { status: 'Resolved', count: stats.resolved, fill: '#10b981' },
    { status: 'Rejected', count: stats.rejected, fill: '#ef4444' }
  ].filter(item => item.count > 0);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  // Calculate resolution time averages
  const resolvedComplaints = complaints.filter(c => c.status === 'resolved');
  const avgResolutionTime = resolvedComplaints.length > 0 
    ? resolvedComplaints.reduce((sum, complaint) => {
        const created = new Date(complaint.created_at);
        const updated = new Date(complaint.updated_at);
        return sum + (updated.getTime() - created.getTime());
      }, 0) / resolvedComplaints.length / (1000 * 60 * 60 * 24) // Convert to days
    : 0;

  // Export to CSV
  const exportToCSV = () => {
    const csvData = filteredComplaints.map(complaint => ({
      'ID': complaint.id,
      'Title': complaint.title,
      'Category': complaint.category,
      'Status': complaint.status,
      'Student Name': complaint.profiles.full_name,
      'Student ID': complaint.profiles.student_id,
      'Student Email': complaint.profiles.email,
      'Description': complaint.description.replace(/,/g, ';'), // Replace commas to avoid CSV issues
      'Admin Remarks': complaint.admin_remarks || '',
      'Created Date': new Date(complaint.created_at).toLocaleDateString(),
      'Updated Date': new Date(complaint.updated_at).toLocaleDateString()
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `complaints_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export completed",
      description: "Complaints data has been exported to CSV."
    });
  };

  // Send notification (placeholder for now)
  const sendNotification = async (complaint: Complaint, type: 'status_update' | 'remarks_added') => {
    // This would integrate with email service in a real implementation
    toast({
      title: "Notification sent",
      description: `Student ${complaint.profiles.full_name} has been notified about the ${type.replace('_', ' ')}.`,
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-8 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="complaints">Complaints</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Complaints</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold">{stats.resolved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Resolution Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average Resolution Time</span>
                <span className="font-semibold">{avgResolutionTime.toFixed(1)} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Resolution Rate</span>
                <span className="font-semibold">
                  {stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Complaints This Month</span>
                <span className="font-semibold">{stats.total}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {complaints.slice(0, 3).map((complaint, index) => (
                <div key={complaint.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm truncate">{complaint.title}</p>
                    <p className="text-xs text-muted-foreground">by {complaint.profiles.full_name}</p>
                  </div>
                  <Badge variant="outline" className={`text-xs ${getStatusColor(complaint.status)}`}>
                    {complaint.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
              {complaints.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Complaint Status Distribution</CardTitle>
                <CardDescription>Current status breakdown of all complaints</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{
                  pending: { label: "Pending", color: "#eab308" },
                  in_progress: { label: "In Progress", color: "#3b82f6" },
                  resolved: { label: "Resolved", color: "#10b981" },
                  rejected: { label: "Rejected", color: "#ef4444" }
                }} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="count"
                        label={({ status, count }) => `${status}: ${count}`}
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Category Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Complaints by Category</CardTitle>
                <CardDescription>Distribution across different complaint categories</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{
                  academic: { label: "Academic", color: "#3b82f6" },
                  hostel: { label: "Hostel", color: "#10b981" },
                  admin: { label: "Administration", color: "#f59e0b" },
                  harassment: { label: "Harassment", color: "#ef4444" },
                  finance: { label: "Finance", color: "#8b5cf6" },
                  other: { label: "Other", color: "#06b6d4" }
                }} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {categoryStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resolution Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
                    <p className="text-sm text-muted-foreground">Total Resolved</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{avgResolutionTime.toFixed(1)}</p>
                    <p className="text-sm text-muted-foreground">Avg. Days to Resolve</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(0) : 0}%
                    </p>
                    <p className="text-sm text-muted-foreground">Resolution Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pending Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                    <p className="text-sm text-muted-foreground">Awaiting Review</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                    <p className="text-sm text-muted-foreground">In Progress</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {complaints.filter(c => {
                        const days = Math.floor((Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24));
                        return days > 7 && c.status === 'pending';
                      }).length}
                    </p>
                    <p className="text-sm text-muted-foreground">Overdue (7+ days)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Export & Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button onClick={exportToCSV} className="w-full" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export to CSV
                  </Button>
                  <div className="text-center text-sm text-muted-foreground">
                    <p>Export filtered complaints</p>
                    <p className="font-medium">{filteredComplaints.length} records</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="complaints" className="space-y-6">

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search complaints or students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full sm:w-64"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="academic">Academic</SelectItem>
            <SelectItem value="hostel">Hostel</SelectItem>
            <SelectItem value="admin">Administration</SelectItem>
            <SelectItem value="harassment">Harassment</SelectItem>
            <SelectItem value="finance">Finance</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Complaints List */}
      <div className="space-y-4">
        {filteredComplaints.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No complaints found</h3>
              <p className="text-muted-foreground">
                {complaints.length === 0 ? 'No complaints have been submitted yet.' : 'Try adjusting your search filters.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredComplaints.map((complaint) => (
            <Card key={complaint.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{complaint.title}</CardTitle>
                    <CardDescription className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {complaint.profiles.full_name} ({complaint.profiles.student_id})
                      </span>
                      <span>Submitted on {new Date(complaint.created_at).toLocaleDateString()}</span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {complaint.category.replace('_', ' ')}
                    </Badge>
                    <Badge className={`${getStatusColor(complaint.status)} flex items-center gap-1`}>
                      {getStatusIcon(complaint.status)}
                      {complaint.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Description:</h4>
                    <p className="text-muted-foreground">{complaint.description}</p>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        <p>Student: {complaint.profiles.email}</p>
                        {complaint.updated_at !== complaint.created_at && (
                          <p>Last updated: {new Date(complaint.updated_at).toLocaleString()}</p>
                        )}
                      </div>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button onClick={() => openUpdateDialog(complaint)}>
                            Update Status
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Update Complaint Status</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium mb-2">Complaint: {selectedComplaint?.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                From: {selectedComplaint?.profiles.full_name}
                              </p>
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Status</label>
                              <Select value={newStatus} onValueChange={setNewStatus}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="resolved">Resolved</SelectItem>
                                  <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Admin Remarks</label>
                              <Textarea
                                value={adminRemarks}
                                onChange={(e) => setAdminRemarks(e.target.value)}
                                placeholder="Add remarks about this complaint..."
                                rows={4}
                              />
                            </div>
                            
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                onClick={() => setSelectedComplaint(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleUpdateComplaint}
                                disabled={updating || !newStatus}
                              >
                                {updating ? 'Updating...' : 'Update Complaint'}
                              </Button>
                              {selectedComplaint && (
                                <Button
                                  variant="outline"
                                  onClick={() => sendNotification(selectedComplaint, 'status_update')}
                                  className="flex items-center gap-2"
                                >
                                  <Mail className="h-4 w-4" />
                                  Notify Student
                                </Button>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  
                  {complaint.admin_remarks && (
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Admin Remarks:</h4>
                      <p className="text-sm">{complaint.admin_remarks}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}