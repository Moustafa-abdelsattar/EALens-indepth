import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { Upload, X, CheckCircle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  file: File;
}

interface Targets {
  classConsumption: number;
  superClassConsumption: number;
  upgradeRate: number;
  fixedRate: number;
}

interface Weights {
  classConsumption: number;
  superClassConsumption: number;
  upgradeRate: number;
  fixedRate: number;
}

const UploadTargets = () => {
  const [files, setFiles] = useState<Record<string, UploadedFile | null>>({
    classConsumption: null,
    fixed: null,
    referral: null,
    upgrade: null,
    allLeads: null,
  });
  
  const [targets, setTargets] = useState<Targets>(() => {
    const saved = localStorage.getItem("cmlens_targets");
    return saved ? JSON.parse(saved) : {
      classConsumption: 80,
      superClassConsumption: 15,
      upgradeRate: 25,
      fixedRate: 60,
    };
  });

  const [weights, setWeights] = useState<Weights>(() => {
    const saved = localStorage.getItem("cmlens_weights");
    return saved ? JSON.parse(saved) : {
      classConsumption: 25,
      superClassConsumption: 25,
      upgradeRate: 25,
      fixedRate: 25,
    };
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);

  const fileLabels = {
    classConsumption: "Class Consumption Report",
    fixed: "Fixed Report", 
    referral: "Referral Report",
    upgrade: "Upgrade Report",
    allLeads: "All Leads Report",
  };

  const handleFileUpload = (key: string, file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast({
        title: "Invalid file type",
        description: "Please upload XLSX or XLS files only",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 200 * 1024 * 1024) { // 200MB
      toast({
        title: "File too large",
        description: "File size must be under 200MB",
        variant: "destructive",
      });
      return;
    }

    setFiles(prev => ({
      ...prev,
      [key]: {
        name: file.name,
        size: file.size,
        type: file.type,
        file: file,
      }
    }));
  };

  const handleFileDrop = (key: string, e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(key, file);
    }
  };

  const removeFile = (key: string) => {
    setFiles(prev => ({
      ...prev,
      [key]: null,
    }));
  };

  const saveTargets = () => {
    localStorage.setItem("cmlens_targets", JSON.stringify(targets));
    localStorage.setItem("cmlens_weights", JSON.stringify(weights));
    toast({
      title: "Configuration saved",
      description: "Performance targets and weights have been saved successfully",
    });
  };

  const resetTargets = () => {
    const defaultTargets = {
      classConsumption: 80,
      superClassConsumption: 15,
      upgradeRate: 25,
      fixedRate: 60,
    };
    const defaultWeights = {
      classConsumption: 25,
      superClassConsumption: 25,
      upgradeRate: 25,
      fixedRate: 25,
    };
    setTargets(defaultTargets);
    setWeights(defaultWeights);
    localStorage.setItem("cmlens_targets", JSON.stringify(defaultTargets));
    localStorage.setItem("cmlens_weights", JSON.stringify(defaultWeights));
    toast({
      title: "Configuration reset",
      description: "Performance targets and weights have been reset to defaults",
    });
  };

  const canProcess = Object.values(files).some(file => file !== null);

  const processData = async () => {
    setIsProcessing(true);
    
    try {
      // Collect uploaded files from state
      const filesToUpload: Record<string, File> = {};
      
      Object.entries(files).forEach(([key, fileInfo]) => {
        if (fileInfo && fileInfo.file) {
          filesToUpload[key] = fileInfo.file;
        }
      });

      if (Object.keys(filesToUpload).length === 0) {
        throw new Error('No files selected for processing');
      }

      // Import and use the API service
      const { ApiService } = await import('@/services/api');
      
      const response = await ApiService.processAgentData(filesToUpload);

      if (response && response.agents) {
        // Clear the uploaded files after successful processing
        setFiles({
          classConsumption: null,
          fixed: null,
          referral: null,
          upgrade: null,
          allLeads: null,
        });

        // Set processed count and show modal
        setProcessedCount(response.agents.length);
        setShowSuccessModal(true);
      } else {
        throw new Error('Processing failed - no agent data received');
      }
      
    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
          Upload & Set Targets
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Upload at least one performance report and set target percentages for agent evaluation
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* File Upload Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Report Files</h2>
            <p className="text-sm text-muted-foreground">
              Upload at least one report to process agent performance data
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(fileLabels).map(([key, label]) => (
              <Card key={key} className="glass-card p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">{label}</h3>
                    {files[key] && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(key)}
                        className="h-6 w-6 p-0 text-danger hover:text-danger"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  {!files[key] ? (
                    <div
                      className="border border-dashed border-border bg-muted/20 rounded-lg p-4 text-center hover:border-primary/50 hover:bg-muted/30 transition-all duration-200 cursor-pointer"
                      onDrop={(e) => handleFileDrop(key, e)}
                      onDragOver={(e) => e.preventDefault()}
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.xlsx,.xls';
                        input.setAttribute('data-key', key);
                        input.style.display = 'none';
                        document.body.appendChild(input);
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) handleFileUpload(key, file);
                          document.body.removeChild(input);
                        };
                        input.click();
                      }}
                    >
                      <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                        <p className="text-xs font-medium">Drop or click</p>
                        <p className="text-xs text-muted-foreground">XLSX/XLS</p>
                    </div>
                  ) : (
                    <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-success truncate">
                            {files[key]!.name}
                          </p>
                          <p className="text-xs text-success/80">
                            {formatFileSize(files[key]!.size)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Targets Section */}
        <div className="space-y-6">
          <Card className="glass-card p-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Performance Targets</h2>
                <p className="text-sm text-muted-foreground">
                  Set target percentages for agent performance evaluation
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Class Consumption</Label>
                    <span className="text-sm font-medium text-primary">{targets.classConsumption}%</span>
                  </div>
                  <Slider
                    value={[targets.classConsumption]}
                    onValueChange={(value) => setTargets(prev => ({
                      ...prev,
                      classConsumption: value[0]
                    }))}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Super Class Consumption</Label>
                    <span className="text-sm font-medium text-primary">{targets.superClassConsumption}%</span>
                  </div>
                  <Slider
                    value={[targets.superClassConsumption]}
                    onValueChange={(value) => setTargets(prev => ({
                      ...prev,
                      superClassConsumption: value[0]
                    }))}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Upgrade Rate</Label>
                    <span className="text-sm font-medium text-primary">{targets.upgradeRate}%</span>
                  </div>
                  <Slider
                    value={[targets.upgradeRate]}
                    onValueChange={(value) => setTargets(prev => ({
                      ...prev,
                      upgradeRate: value[0]
                    }))}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Fixed Rate</Label>
                    <span className="text-sm font-medium text-primary">{targets.fixedRate}%</span>
                  </div>
                  <Slider
                    value={[targets.fixedRate]}
                    onValueChange={(value) => setTargets(prev => ({
                      ...prev,
                      fixedRate: value[0]
                    }))}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Weights Section */}
          <Card className="glass-card p-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Performance Weights</h2>
                <p className="text-sm text-muted-foreground">
                  Set the importance (weight) of each metric in the overall score calculation. Total should equal 100%.
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Class Consumption Weight</Label>
                    <span className="text-sm font-medium text-primary">{weights.classConsumption}%</span>
                  </div>
                  <Slider
                    value={[weights.classConsumption]}
                    onValueChange={(value) => setWeights(prev => ({
                      ...prev,
                      classConsumption: value[0]
                    }))}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Super Class Consumption Weight</Label>
                    <span className="text-sm font-medium text-primary">{weights.superClassConsumption}%</span>
                  </div>
                  <Slider
                    value={[weights.superClassConsumption]}
                    onValueChange={(value) => setWeights(prev => ({
                      ...prev,
                      superClassConsumption: value[0]
                    }))}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Upgrade Rate Weight</Label>
                    <span className="text-sm font-medium text-primary">{weights.upgradeRate}%</span>
                  </div>
                  <Slider
                    value={[weights.upgradeRate]}
                    onValueChange={(value) => setWeights(prev => ({
                      ...prev,
                      upgradeRate: value[0]
                    }))}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Fixed Rate Weight</Label>
                    <span className="text-sm font-medium text-primary">{weights.fixedRate}%</span>
                  </div>
                  <Slider
                    value={[weights.fixedRate]}
                    onValueChange={(value) => setWeights(prev => ({
                      ...prev,
                      fixedRate: value[0]
                    }))}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Total Weight:</span>
                    <span className={`font-bold ${
                      (weights.classConsumption + weights.superClassConsumption + weights.upgradeRate + weights.fixedRate) === 100 
                        ? 'text-green-600' 
                        : 'text-orange-600'
                    }`}>
                      {weights.classConsumption + weights.superClassConsumption + weights.upgradeRate + weights.fixedRate}%
                    </span>
                  </div>
                  {(weights.classConsumption + weights.superClassConsumption + weights.upgradeRate + weights.fixedRate) !== 100 && (
                    <p className="text-xs text-orange-600 mt-1">
                      ⚠️ Weights should total 100% for accurate scoring
                    </p>
                  )}
                </div>
              </div>

              <div className="flex space-x-3">
                <Button onClick={saveTargets} variant="outline" className="flex-1">
                  Save Configuration
                </Button>
                <Button onClick={resetTargets} variant="ghost" className="flex-1">
                  Reset All
                </Button>
              </div>
            </div>
          </Card>

          {/* Process Button */}
          <Button
            onClick={processData}
            disabled={!canProcess || isProcessing}
            className="w-full btn-hero py-4 text-lg"
          >
            {isProcessing ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Processing Data...</span>
              </div>
            ) : (
              `Process Data (${Object.values(files).filter(f => f).length}/5 files)`
            )}
          </Button>
        </div>
      </div>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-success/10 p-3">
                <CheckCircle2 className="h-12 w-12 text-success" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">Upload Successful</DialogTitle>
            <DialogDescription className="text-center space-y-4 pt-4">
              <p className="text-base text-foreground">
                Thank you for taking the time to upload the data. We have successfully processed{" "}
                <span className="font-semibold text-primary">{processedCount} agent records</span>.
              </p>
              <p className="text-sm text-muted-foreground">
                The data has been securely stored and will reach the team smoothly.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-6">
            <Button
              onClick={() => setShowSuccessModal(false)}
              className="px-8"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UploadTargets;