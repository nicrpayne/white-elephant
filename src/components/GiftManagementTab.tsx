import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, ExternalLink, Edit, Trash2, Grid3x3, List, GripVertical } from 'lucide-react';
import BulkGiftLoader from '@/components/BulkGiftLoader';

interface Gift {
  id: string;
  name: string;
  imageUrl: string;
  link?: string;
  status: 'hidden' | 'revealed' | 'locked' | 'stolen';
  description?: string;
}

interface PreviewData {
  title: string;
  description: string;
  image: string;
  url: string;
}

interface GiftManagementTabProps {
  gifts: Gift[];
  addGiftAsync: (gift: { name: string; imageUrl: string; link: string; description: string }) => Promise<void>;
  addGiftsBatchAsync: (gifts: { name: string; imageUrl: string; link: string; description: string }[]) => Promise<void>;
  removeGift: (giftId: string) => void;
  updateGift: (giftId: string, updates: Partial<Gift>) => void;
  reorderGifts: (draggedId: string, targetId: string) => void;
}

export default function GiftManagementTab({
  gifts,
  addGiftAsync,
  addGiftsBatchAsync,
  removeGift,
  updateGift,
  reorderGifts
}: GiftManagementTabProps) {
  // State for adding new gift
  const [newGiftUrl, setNewGiftUrl] = useState("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  
  // State for editing gift images
  const [editingImageUrl, setEditingImageUrl] = useState("");
  const [showImageEdit, setShowImageEdit] = useState(false);
  const [editingGiftId, setEditingGiftId] = useState<string | null>(null);
  
  // State for gift list view
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [selectedGiftIds, setSelectedGiftIds] = useState<Set<string>>(new Set());
  const [draggedGiftId, setDraggedGiftId] = useState<string | null>(null);

  // Handle URL change and fetch preview
  const handleUrlChange = (url: string) => {
    setNewGiftUrl(url);
    
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      setIsLoadingPreview(true);
      
      // Debounce the preview fetch
      const timeoutId = setTimeout(async () => {
        try {
          let title = 'Gift Item';
          let description = '';
          let image = 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80';
          
          // Special handling for Amazon URLs - extract from URL instead of scraping
          if (url.includes('amazon.com')) {
            // Extract ASIN from Amazon URL
            const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/i) || url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
            
            if (asinMatch) {
              // Extract product name from URL slug (the part before /dp/)
              const urlParts = url.split('/');
              const dpIndex = urlParts.findIndex(part => part === 'dp' || part === 'product');
              
              if (dpIndex > 0 && urlParts[dpIndex - 1]) {
                const slug = urlParts[dpIndex - 1];
                // Convert URL slug to readable title
                // Example: "like-new-amazon-kindle" → "Like New Amazon Kindle"
                title = slug
                  .split('-')
                  .map(word => {
                    // Capitalize first letter of each word
                    const capitalized = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                    return capitalized;
                  })
                  .join(' ')
                  .substring(0, 80); // Limit length
                
                // Clean up common words to look more natural
                title = title
                  .replace(/\bAnd\b/g, 'and')
                  .replace(/\bOr\b/g, 'or')
                  .replace(/\bThe\b/g, 'the')
                  .replace(/\bA\b/g, 'a')
                  .replace(/\bAn\b/g, 'an')
                  .replace(/\bIn\b/g, 'in')
                  .replace(/\bOn\b/g, 'on')
                  .replace(/\bAt\b/g, 'at')
                  .replace(/\bTo\b/g, 'to')
                  .replace(/\bFor\b/g, 'for')
                  .replace(/\bOf\b/g, 'of')
                  .replace(/\bWith\b/g, 'with');
                
              } else {
                title = 'Amazon Product';
              }
              
              description = `Amazon product preview unavailable (Amazon blocks automated requests). The product link works perfectly - players will see the full details when they click "View Product".`;
              
              // Use nice fallback image
              image = 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80';
            }
            
            setPreviewData({
              title: title.trim(),
              description: description.trim(),
              image: image,
              url: url
            });
          } else {
            // For non-Amazon URLs, try to fetch preview
            const corsProxy = 'https://api.allorigins.win/raw?url=';
            const response = await fetch(corsProxy + encodeURIComponent(url));
            const html = await response.text();
            
            // Parse HTML to extract metadata
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Helper to get meta content
            const getMetaContent = (property: string) => {
              const meta = doc.querySelector(`meta[property="${property}"]`) || 
                           doc.querySelector(`meta[name="${property}"]`);
              return meta?.getAttribute('content') || '';
            };
            
            // Extract Open Graph data
            title = getMetaContent('og:title') || 
                         doc.querySelector('title')?.textContent || 
                         'Product';
            
            description = getMetaContent('og:description') || 
                               getMetaContent('description') || 
                               '';
            
            image = getMetaContent('og:image') || 
                         getMetaContent('twitter:image') || 
                         doc.querySelector('img')?.src ||
                         'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80';
            
            // Handle relative URLs
            if (image.startsWith('/')) {
              const urlObj = new URL(url);
              image = `${urlObj.protocol}//${urlObj.host}${image}`;
            } else if (!image.startsWith('http')) {
              const urlObj = new URL(url);
              image = `${urlObj.protocol}//${urlObj.host}/${image}`;
            }
            
            setPreviewData({
              title: title.trim(),
              description: description.trim(),
              image: image,
              url: url
            });
          }
        } catch (error) {
          console.error('Error fetching preview:', error);
          
          // Fallback: Try to create basic preview
          setPreviewData({
            title: "Gift Item",
            description: "Preview unavailable",
            image: 'https://images.unsplash.com/photo-513885535751-8b9238bd345a?w=400&q=80',
            url: url
          });
        } finally {
          setIsLoadingPreview(false);
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    } else {
      setPreviewData(null);
    }
  };

  // Handle adding gift
  const handleAddGift = async () => {
    if (previewData) {
      try {
        await addGiftAsync({
          name: previewData.title,
          imageUrl: previewData.image,
          link: previewData.url,
          description: previewData.description,
        });
        
        // Clear form
        setNewGiftUrl('');
        setPreviewData(null);
      } catch (error) {
        console.error('Error adding gift:', error);
        alert('Failed to add gift. Please try again.');
      }
    }
  };

  // Handle updating preview image
  const handleUpdatePreviewImage = () => {
    if (editingImageUrl && previewData) {
      setPreviewData({
        ...previewData,
        image: editingImageUrl
      });
      setEditingImageUrl('');
      setShowImageEdit(false);
    }
  };

  // Handle updating gift image
  const handleUpdateGiftImage = async () => {
    if (!editingGiftId || !editingImageUrl) return;
    
    try {
      updateGift(editingGiftId, { imageUrl: editingImageUrl });
      setEditingImageUrl('');
      setShowImageEdit(false);
      setEditingGiftId(null);
    } catch (error) {
      console.error('Error updating gift image:', error);
      alert('Failed to update image. Please try again.');
    }
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isPreview: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a local URL for the image
    const reader = new FileReader();
    reader.onloadend = () => {
      const imageUrl = reader.result as string;
      
      if (isPreview && previewData) {
        setPreviewData({
          ...previewData,
          image: imageUrl
        });
      } else if (editingGiftId) {
        updateGift(editingGiftId, { imageUrl });
        setShowImageEdit(false);
        setEditingGiftId(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle removing gift
  const handleRemoveGift = async (giftId: string) => {
    try {
      removeGift(giftId);
    } catch (error) {
      console.error('Error removing gift:', error);
      alert('Failed to remove gift. Please try again.');
    }
  };

  // Handle bulk delete
  const handleBulkDeleteGifts = async () => {
    try {
      for (const giftId of selectedGiftIds) {
        removeGift(giftId);
      }
      setSelectedGiftIds(new Set());
    } catch (error) {
      console.error('Error deleting gifts:', error);
      alert('Failed to delete some gifts. Please try again.');
    }
  };

  // Handle gift selection
  const toggleGiftSelection = (giftId: string) => {
    const newSelected = new Set(selectedGiftIds);
    if (newSelected.has(giftId)) {
      newSelected.delete(giftId);
    } else {
      newSelected.add(giftId);
    }
    setSelectedGiftIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedGiftIds.size === gifts.length) {
      setSelectedGiftIds(new Set());
    } else {
      setSelectedGiftIds(new Set(gifts.map(g => g.id)));
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, giftId: string) => {
    setDraggedGiftId(giftId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetGiftId: string) => {
    e.preventDefault();
    if (draggedGiftId && draggedGiftId !== targetGiftId) {
      reorderGifts(draggedGiftId, targetGiftId);
    }
    setDraggedGiftId(null);
  };

  const handleDragEnd = () => {
    setDraggedGiftId(null);
  };

  return (
    <div className="space-y-4">
      {/* Add New Gift Card */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Add New Gift</CardTitle>
          <CardDescription>
            Paste a product link from Amazon, Etsy, or any website
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="giftUrl">Product Link</Label>
              <div className="flex gap-2">
                <Input
                  id="giftUrl"
                  value={newGiftUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && previewData) {
                      handleAddGift();
                    }
                  }}
                  placeholder="https://amazon.com/product/..."
                  className="flex-1"
                />
                {isLoadingPreview && (
                  <div className="flex items-center px-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Paste a product link and the preview will load automatically
              </p>
            </div>

            {previewData && (
              <Card className="overflow-hidden border-2 border-primary">
                <div className="flex flex-col sm:flex-row">
                  <div className="sm:w-1/3 min-h-[200px] bg-muted relative group flex items-center justify-center p-4">
                    <img
                      src={previewData.image}
                      alt={previewData.title}
                      className="max-w-full max-h-[300px] object-contain"
                      onError={(e) => {
                        console.error('Image failed to load:', previewData.image);
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Dialog open={showImageEdit && !editingGiftId} onOpenChange={setShowImageEdit}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="secondary"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Image
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Update Gift Image</DialogTitle>
                            <DialogDescription>
                              Upload an image or paste an image URL
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="imageUrl">Image URL</Label>
                              <Input
                                id="imageUrl"
                                value={editingImageUrl}
                                onChange={(e) => setEditingImageUrl(e.target.value)}
                                placeholder="https://example.com/image.jpg"
                              />
                              <Button 
                                onClick={handleUpdatePreviewImage}
                                disabled={!editingImageUrl}
                                className="w-full"
                              >
                                Update Image
                              </Button>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                              <Label htmlFor="imageUpload">Upload Image</Label>
                              <Input
                                id="imageUpload"
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  handleImageUpload(e, true);
                                  setShowImageEdit(false);
                                }}
                              />
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  <div className="flex-1 p-4">
                    <h3 className="font-semibold text-lg mb-2">
                      {previewData.title}
                    </h3>
                    {previewData.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {previewData.description}
                      </p>
                    )}
                    <a
                      href={previewData.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      View Product
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </CardContent>
        {previewData && (
          <CardFooter>
            <Button 
              onClick={handleAddGift}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Gift to Game
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Bulk Gift Loader */}
      <BulkGiftLoader onAddGifts={async (giftsToAdd) => {
        try {
          await addGiftsBatchAsync(giftsToAdd);
        } catch (error) {
          console.error('Error in batch add:', error);
          throw error;
        }
      }} />

      {/* Gift List Card */}
      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gift List</CardTitle>
              <CardDescription>
                Manage gifts for this session ({gifts.length} gifts)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {selectedGiftIds.size > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete ({selectedGiftIds.size})
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Selected Gifts</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete {selectedGiftIds.size} selected gift(s)?
                        This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <Button
                      onClick={handleBulkDeleteGifts}
                      variant="destructive"
                      className="w-full"
                    >
                      Delete {selectedGiftIds.size} Gift(s)
                    </Button>
                  </DialogContent>
                </Dialog>
              )}
              <div className="flex items-center gap-1 border rounded-md">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-r-none"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gifts.map((gift) => (
                  <Card key={gift.id} className="overflow-hidden">
                    <div className="aspect-video relative bg-muted group flex items-center justify-center p-2">
                      <img
                        src={gift.imageUrl}
                        alt={gift.name}
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          console.error('Gift image failed to load:', gift.imageUrl);
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80';
                        }}
                      />
                      <Badge
                        className="absolute top-2 right-2"
                        variant={
                          gift.status === "hidden"
                            ? "outline"
                            : gift.status === "revealed"
                              ? "secondary"
                              : gift.status === "locked"
                                ? "default"
                                : "destructive"
                        }
                      >
                        {gift.status}
                      </Badge>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Dialog 
                          open={showImageEdit && editingGiftId === gift.id} 
                          onOpenChange={(open) => {
                            setShowImageEdit(open);
                            if (!open) setEditingGiftId(null);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setEditingGiftId(gift.id)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Image
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Update Gift Image</DialogTitle>
                              <DialogDescription>
                                Upload an image or paste an image URL
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor={`imageUrl-${gift.id}`}>Image URL</Label>
                                <Input
                                  id={`imageUrl-${gift.id}`}
                                  value={editingImageUrl}
                                  onChange={(e) => setEditingImageUrl(e.target.value)}
                                  placeholder="https://example.com/image.jpg"
                                />
                                <Button 
                                  onClick={handleUpdateGiftImage}
                                  disabled={!editingImageUrl}
                                  className="w-full"
                                >
                                  Update Image
                                </Button>
                              </div>
                              <Separator />
                              <div className="space-y-2">
                                <Label htmlFor={`imageUpload-${gift.id}`}>Upload Image</Label>
                                <Input
                                  id={`imageUpload-${gift.id}`}
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    handleImageUpload(e, false);
                                    setShowImageEdit(false);
                                  }}
                                />
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium line-clamp-1">{gift.name}</h3>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Remove Gift</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to remove this gift?
                                  This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <Button
                                onClick={() => handleRemoveGift(gift.id)}
                                className="w-full"
                              >
                                Remove
                              </Button>
                            </DialogContent>
                          </Dialog>
                        </div>
                        {gift.link && (
                          <a
                            href={gift.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            View Product
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {gifts.length > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg border font-medium text-sm">
                    <Checkbox
                      checked={selectedGiftIds.size === gifts.length && gifts.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                    <div className="w-12 text-center">Image</div>
                    <div className="flex-1">Name</div>
                    <div className="w-24">Status</div>
                    <div className="w-20 text-center">Actions</div>
                  </div>
                )}
                {gifts.map((gift) => (
                  <div
                    key={gift.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, gift.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, gift.id)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 p-3 bg-card rounded-lg border hover:bg-accent/50 transition-colors cursor-move ${
                      draggedGiftId === gift.id ? 'opacity-50' : ''
                    }`}
                  >
                    <Checkbox
                      checked={selectedGiftIds.has(gift.id)}
                      onCheckedChange={() => toggleGiftSelection(gift.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                    <div className="w-12 h-12 bg-muted rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img
                        src={gift.imageUrl}
                        alt={gift.name}
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          console.error('Gift image failed to load:', gift.imageUrl);
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{gift.name}</h3>
                      {gift.link && (
                        <a
                          href={gift.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Product
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <Badge
                      className="w-24 justify-center"
                      variant={
                        gift.status === "hidden"
                          ? "outline"
                          : gift.status === "revealed"
                            ? "secondary"
                            : gift.status === "locked"
                              ? "default"
                              : "destructive"
                      }
                    >
                      {gift.status}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Dialog 
                        open={showImageEdit && editingGiftId === gift.id} 
                        onOpenChange={(open) => {
                          setShowImageEdit(open);
                          if (!open) setEditingGiftId(null);
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingGiftId(gift.id);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Update Gift Image</DialogTitle>
                            <DialogDescription>
                              Upload an image or paste an image URL
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor={`imageUrl-list-${gift.id}`}>Image URL</Label>
                              <Input
                                id={`imageUrl-list-${gift.id}`}
                                value={editingImageUrl}
                                onChange={(e) => setEditingImageUrl(e.target.value)}
                                placeholder="https://example.com/image.jpg"
                              />
                              <Button 
                                onClick={handleUpdateGiftImage}
                                disabled={!editingImageUrl}
                                className="w-full"
                              >
                                Update Image
                              </Button>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                              <Label htmlFor={`imageUpload-list-${gift.id}`}>Upload Image</Label>
                              <Input
                                id={`imageUpload-list-${gift.id}`}
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  handleImageUpload(e, false);
                                  setShowImageEdit(false);
                                }}
                              />
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Remove Gift</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to remove this gift?
                              This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <Button
                            onClick={() => handleRemoveGift(gift.id)}
                            className="w-full"
                          >
                            Remove
                          </Button>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}