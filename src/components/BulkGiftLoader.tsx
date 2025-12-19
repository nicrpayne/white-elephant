import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, Check, Plus, ExternalLink, RefreshCw } from 'lucide-react';

interface BulkPreview {
  url: string;
  title: string;
  description: string;
  image: string;
  status: 'loading' | 'success' | 'error';
  approved: boolean;
}

interface BulkGiftLoaderProps {
  onAddGifts: (gifts: Array<{
    name: string;
    imageUrl: string;
    link: string;
    description: string;
  }>) => Promise<void>;
}

export default function BulkGiftLoader({ onAddGifts }: BulkGiftLoaderProps) {
  const [bulkUrls, setBulkUrls] = useState("");
  const [bulkPreviews, setBulkPreviews] = useState<BulkPreview[]>([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const { toast } = useToast();
  const previewSectionRef = useRef<HTMLDivElement>(null);

  // Auto-preview URLs as they're typed (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (bulkUrls.trim()) {
        handleBulkLoad();
      } else {
        setBulkPreviews([]);
      }
    }, 800); // 800ms debounce

    return () => clearTimeout(timeoutId);
  }, [bulkUrls]);

  // Auto-scroll to preview section when previews start loading
  useEffect(() => {
    if (bulkPreviews.length > 0 && previewSectionRef.current) {
      previewSectionRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }, [bulkPreviews.length]);

  const fetchPreviewForUrl = async (url: string): Promise<BulkPreview> => {
    try {
      let title = 'Gift Item';
      let description = '';
      let image = 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80';
      
      // Special handling for Amazon URLs - extract from URL instead of scraping
      if (url.includes('amazon.com')) {
        // Extract ASIN from Amazon URL
        const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/i) || url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
        
        if (asinMatch) {
          const asin = asinMatch[1];
          console.log('Found Amazon ASIN:', asin);
          
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
            
            console.log('Extracted title from URL:', title);
          } else {
            title = 'Amazon Product';
          }
          
          description = `Amazon product preview unavailable (Amazon blocks automated requests). The product link works perfectly - players will see the full details when they click "View Product".`;
          
          // Use nice fallback image
          image = 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80';
          
          console.log('Amazon URL processed:', { title, asin });
        }
        
        return {
          title: title.trim(),
          description: description.trim(),
          image: image,
          url: url,
          status: 'success',
          approved: true,
        };
      }
      
      // For non-Amazon URLs, try to fetch preview
      const corsProxies = [
        'https://corsproxy.io/?',
        'https://api.allorigins.win/raw?url=',
      ];
      
      let html = '';
      let lastError = null;
      
      for (const corsProxy of corsProxies) {
        try {
          const response = await fetch(corsProxy + encodeURIComponent(url));
          if (response.ok) {
            html = await response.text();
            break;
          }
        } catch (err) {
          lastError = err;
          continue;
        }
      }
      
      if (!html) {
        throw lastError || new Error('All CORS proxies failed');
      }
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const getMetaContent = (property: string) => {
        const meta = doc.querySelector(`meta[property="${property}"]`) || 
                     doc.querySelector(`meta[name="${property}"]`);
        return meta?.getAttribute('content') || '';
      };
      
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
      
      if (image.startsWith('/')) {
        const urlObj = new URL(url);
        image = `${urlObj.protocol}//${urlObj.host}${image}`;
      } else if (!image.startsWith('http')) {
        const urlObj = new URL(url);
        image = `${urlObj.protocol}//${urlObj.host}/${image}`;
      }
      
      return {
        title: title.trim(),
        description: description.trim(),
        image: image,
        url: url,
        status: 'success',
        approved: true,
      };
    } catch (error) {
      console.error('Error fetching preview for', url, error);
      return {
        title: 'Gift Item',
        description: 'Could not fetch preview',
        image: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80',
        url: url,
        status: 'error',
        approved: false,
      };
    }
  };

  const handleBulkLoad = async () => {
    const urls = bulkUrls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0 && url.startsWith('http'));
    
    if (urls.length === 0) {
      alert('Please enter at least one valid URL');
      return;
    }

    setIsBulkLoading(true);
    const previews: BulkPreview[] = [];

    // Initialize all as loading
    urls.forEach(url => {
      previews.push({
        url,
        title: '',
        description: '',
        image: '',
        status: 'loading',
        approved: true,
      });
    });
    setBulkPreviews([...previews]);

    // Fetch previews one by one
    for (let i = 0; i < urls.length; i++) {
      const preview = await fetchPreviewForUrl(urls[i]);
      previews[i] = preview;
      setBulkPreviews([...previews]);
    }

    setIsBulkLoading(false);
  };

  const handleApproveAll = () => {
    setBulkPreviews(prev => prev.map(p => ({ ...p, approved: true })));
  };

  const handleRejectAll = () => {
    setBulkPreviews(prev => prev.map(p => ({ ...p, approved: false })));
  };

  const toggleApproval = (index: number) => {
    setBulkPreviews(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], approved: !updated[index].approved };
      return updated;
    });
  };

  const retryPreview = async (index: number) => {
    const preview = bulkPreviews[index];
    if (!preview) return;

    // Set to loading state
    setBulkPreviews(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: 'loading' };
      return updated;
    });

    // Retry fetching the preview
    const newPreview = await fetchPreviewForUrl(preview.url);
    
    setBulkPreviews(prev => {
      const updated = [...prev];
      updated[index] = newPreview;
      return updated;
    });
  };

  const handleAddApprovedGifts = async () => {
    const approvedGifts = bulkPreviews.filter(p => p.approved && p.status === 'success');
    
    if (approvedGifts.length === 0) {
      toast({
        title: "No gifts to add",
        description: "Please approve at least one gift to add.",
        variant: "destructive",
      });
      return;
    }

    // Show progress toast for large batches
    if (approvedGifts.length > 10) {
      toast({
        title: "Adding gifts...",
        description: `Processing ${approvedGifts.length} gifts. This may take a moment.`,
      });
    }

    try {
      // Truncate image URLs if they're too long (some OG images have very long data URLs)
      const giftsToAdd = approvedGifts.map(gift => {
        let imageUrl = gift.image;
        
        // If it's a data URL or extremely long URL, use a fallback
        if (imageUrl.startsWith('data:') || imageUrl.length > 2000) {
          console.warn(`Image URL too long for "${gift.title}", using fallback`);
          imageUrl = 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80';
        }
        
        return {
          name: gift.title.slice(0, 255), // Limit title length
          imageUrl: imageUrl,
          link: gift.url,
          description: gift.description?.slice(0, 1000) || undefined, // Limit description length
        };
      });

      await onAddGifts(giftsToAdd);
      
      // Wait for state to update and UI to render before showing notification
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Clear bulk state
      setBulkUrls('');
      setBulkPreviews([]);
      
      toast({
        title: "Gifts added successfully!",
        description: `${approvedGifts.length} gift(s) have been added to your session.`,
      });
    } catch (error: any) {
      console.error('Error adding bulk gifts:', error);
      toast({
        title: "Error adding gifts",
        description: error.message || "Failed to add some gifts. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Bulk Load Gifts</CardTitle>
        <CardDescription>
          Paste multiple product links (one per line) to load and approve them all at once
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bulkUrls">Product Links (one per line)</Label>
            <textarea
              id="bulkUrls"
              value={bulkUrls}
              onChange={(e) => setBulkUrls(e.target.value)}
              placeholder="https://amazon.com/product/...&#10;https://etsy.com/listing/...&#10;https://example.com/item/..."
              className="w-full min-h-[120px] p-3 border rounded-md resize-y font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Paste one URL per line. Previews will load automatically.
            </p>
          </div>

          {isBulkLoading && bulkPreviews.length === 0 && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Loading previews...
            </div>
          )}

          {bulkPreviews.length > 0 && (
            <div ref={previewSectionRef} className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">
                  Previews ({bulkPreviews.filter(p => p.approved && p.status === 'success').length}/{bulkPreviews.length} approved)
                </h4>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleApproveAll}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRejectAll}
                  >
                    Reject All
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {bulkPreviews.map((preview, index) => (
                    <Card 
                      key={index} 
                      className={`overflow-hidden transition-all ${
                        preview.approved 
                          ? 'border-2 border-green-500' 
                          : 'border-2 border-muted opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3 p-3">
                        <Checkbox
                          checked={preview.approved}
                          onCheckedChange={() => toggleApproval(index)}
                          disabled={preview.status === 'loading'}
                          className="mt-1"
                        />
                        
                        {preview.status === 'loading' ? (
                          <div className="flex-1 flex items-center gap-3">
                            <div className="w-20 h-20 bg-muted rounded flex items-center justify-center">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-muted-foreground">Loading preview...</p>
                              <p className="text-xs text-muted-foreground truncate">{preview.url}</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="w-20 h-20 bg-muted rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                              <img
                                src={preview.image}
                                alt={preview.title}
                                className="max-w-full max-h-full object-contain"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80';
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="font-semibold text-sm truncate">{preview.title}</h5>
                              {preview.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                  {preview.description}
                                </p>
                              )}
                              <a
                                href={preview.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                              >
                                View Link
                                <ExternalLink className="h-3 w-3" />
                              </a>
                              {preview.status === 'error' && (
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="destructive">
                                    Failed to load
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => retryPreview(index)}
                                    className="h-6 px-2 text-xs"
                                  >
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Retry
                                  </Button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>

              <Button
                onClick={handleAddApprovedGifts}
                disabled={bulkPreviews.filter(p => p.approved && p.status === 'success').length === 0}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add {bulkPreviews.filter(p => p.approved && p.status === 'success').length} Approved Gift(s)
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}