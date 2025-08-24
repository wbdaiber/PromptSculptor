import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Plus, 
  Trash2, 
  Key, 
  Eye, 
  EyeOff, 
  Shield, 
  ExternalLink,
  Loader2 
} from 'lucide-react';

const addKeySchema = z.object({
  service: z.enum(['openai', 'anthropic', 'gemini'], {
    required_error: 'Please select a service',
  }),
  apiKey: z.string().min(20, 'API key appears to be too short'),
  keyName: z.string().min(1, 'Please enter a name for this API key').max(50, 'Name is too long'),
});

type AddKeyFormData = z.infer<typeof addKeySchema>;

const serviceConfig = {
  openai: {
    name: 'OpenAI',
    description: 'Access GPT models (GPT-4, GPT-3.5)',
    icon: '🤖',
    keyPrefix: 'sk-',
    docsUrl: 'https://platform.openai.com/api-keys',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  },
  anthropic: {
    name: 'Anthropic',
    description: 'Access Claude models',
    icon: '🧠',
    keyPrefix: 'sk-ant-',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  },
  gemini: {
    name: 'Google Gemini',
    description: 'Access Gemini Pro models',
    icon: '💎',
    keyPrefix: 'AIza',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  },
};

export const ApiKeyManager: React.FC = () => {
  const { apiKeys, addApiKey, removeApiKey, refreshApiKeys } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AddKeyFormData>({
    resolver: zodResolver(addKeySchema),
  });

  const selectedService = watch('service');

  const handleAddKey = async (data: AddKeyFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await addApiKey(data.service, data.apiKey, data.keyName);
      setIsAddDialogOpen(false);
      reset();
      setShowApiKey(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add API key');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveKey = async (keyId: string) => {
    try {
      await removeApiKey(keyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove API key');
    }
  };

  const validateApiKeyFormat = (value: string, service: string): boolean => {
    if (!service) return true; // Let required validation handle empty service
    const config = serviceConfig[service as keyof typeof serviceConfig];
    return value.startsWith(config.keyPrefix);
  };

  const maskApiKey = (key: string): string => {
    if (key.length <= 8) return '•'.repeat(key.length);
    return key.slice(0, 4) + '•'.repeat(key.length - 8) + key.slice(-4);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              API Key Management
            </CardTitle>
            <CardDescription>
              Manage your personal API keys for AI services. Keys are encrypted and stored securely.
            </CardDescription>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add API Key
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add API Key</DialogTitle>
                <DialogDescription>
                  Add a new API key for accessing AI services. Your key will be encrypted and stored securely.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit(handleAddKey)} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="service">Service</Label>
                  <Select onValueChange={(value) => setValue('service', value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select AI service" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(serviceConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <span>{config.icon}</span>
                            <span>{config.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.service && (
                    <p className="text-sm text-red-500">{errors.service.message}</p>
                  )}
                </div>

                {selectedService && (
                  <Alert>
                    <Shield className="w-4 h-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <p>Your {serviceConfig[selectedService].name} API key should start with <code className="bg-muted px-1 rounded">{serviceConfig[selectedService].keyPrefix}</code></p>
                        <a 
                          href={serviceConfig[selectedService].docsUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-600 inline-flex items-center gap-1 text-sm"
                        >
                          Get your API key <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="keyName">Key Name</Label>
                  <Input
                    id="keyName"
                    placeholder="e.g., Personal OpenAI Key"
                    {...register('keyName')}
                    disabled={isLoading}
                  />
                  {errors.keyName && (
                    <p className="text-sm text-red-500">{errors.keyName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <div className="relative">
                    <Input
                      id="apiKey"
                      type={showApiKey ? 'text' : 'password'}
                      placeholder="Enter your API key"
                      {...register('apiKey', {
                        validate: (value) => 
                          selectedService && !validateApiKeyFormat(value, selectedService)
                            ? `API key should start with ${serviceConfig[selectedService].keyPrefix}`
                            : true
                      })}
                      className="pr-10"
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  {errors.apiKey && (
                    <p className="text-sm text-red-500">{errors.apiKey.message}</p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      reset();
                      setError(null);
                      setShowApiKey(false);
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Key'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {apiKeys.length === 0 ? (
          <div className="text-center py-8">
            <Key className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No API Keys Added</h3>
            <p className="text-muted-foreground mb-4">
              Add your personal API keys to access AI services directly.
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First API Key
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {apiKeys.map((key, index) => {
              const config = serviceConfig[key.service as keyof typeof serviceConfig];
              return (
                <div key={key.id}>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{config.icon}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{key.keyName}</h4>
                          <Badge variant="secondary" className={config.color}>
                            {config.name}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {config.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Added {new Date(key.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove API Key</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove "{key.keyName}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleRemoveKey(key.id)}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            Remove Key
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  
                  {index < apiKeys.length - 1 && <Separator />}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};