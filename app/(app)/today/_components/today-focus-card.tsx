'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useReach } from '@/lib/reach-context';
import { useLanguage } from '@/lib/language-context';
import { Edit2, Check, Target, Plus, Trash2 } from 'lucide-react';

export function TodayFocusCard() {
  const { focusTitle, focusItems, updateFocus } = useReach();
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(focusTitle);
  const [editItems, setEditItems] = useState<string[]>([]);

  const startEdit = () => {
    setEditTitle(focusTitle);
    setEditItems([...focusItems]);
    setIsEditing(true);
  };

  const handleAddItem = () => {
    setEditItems(prev => [...prev, '']);
  };

  const handleItemChange = (index: number, val: string) => {
    const updated = [...editItems];
    updated[index] = val;
    setEditItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setEditItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    // Filter empty items
    const filtered = editItems.map(i => i.trim()).filter(Boolean);
    updateFocus(editTitle, filtered);
    setIsEditing(false);
  };

  return (
    <Card className="border border-[#e5e5e0] bg-white shadow-none">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Target className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold font-sans">{t('today.focus_title')}</CardTitle>
            <CardDescription className="text-xs">{t('today.focus_desc')}</CardDescription>
          </div>
        </div>
        {!isEditing && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={startEdit}>
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="pb-4">
        {isEditing ? (
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('today.focus_goal_label')}</label>
              <Input 
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                placeholder="ex: Focus du Jour"
                className="text-sm"
              />
            </div>
            
            <div className="grid gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('today.focus_points_label')}</label>
              <div className="space-y-2">
                {editItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input 
                      value={item}
                      onChange={e => handleItemChange(idx, e.target.value)}
                      placeholder={`${t('today.focus_edit_placeholder')} ${idx + 1}`}
                      className="text-xs h-8"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveItem(idx)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAddItem}
                className="mt-1 w-full text-xs h-8 gap-1.5 border-dashed"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t('today.focus_add_item')}</span>
              </Button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                {t('today.cancel')}
              </Button>
              <Button size="sm" onClick={handleSave} className="gap-1.5">
                <Check className="h-3.5 w-3.5" />
                <span>{t('today.save')}</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">{focusTitle}</h3>
            {focusItems.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">{t('today.focus_no_items')}</p>
            ) : (
              <ul className="space-y-2 pl-1">
                {focusItems.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
export default TodayFocusCard;
