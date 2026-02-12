export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          is_premium: boolean;
          premium_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          is_premium?: boolean;
          premium_expires_at?: string | null;
        };
        Update: {
          email?: string | null;
          display_name?: string | null;
        };
      };
      reminders: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          notes: string | null;
          type: 'time' | 'location';
          trigger_at: string | null;
          recurrence_rule: string | null;
          latitude: number | null;
          longitude: number | null;
          radius: number;
          location_name: string | null;
          trigger_on: 'enter' | 'exit' | 'both' | null;
          is_recurring_location: boolean;
          delivery_method: 'notification' | 'alarm' | 'share';
          alarm_sound: string | null;
          share_contact_name: string | null;
          share_contact_phone: string | null;
          share_message_template: string | null;
          category_id: string | null;
          priority: 'low' | 'medium' | 'high';
          is_completed: boolean;
          is_active: boolean;
          completed_at: string | null;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['reminders']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['reminders']['Insert']>;
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          icon: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      saved_places: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          address: string | null;
          latitude: number;
          longitude: number;
          icon: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['saved_places']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['saved_places']['Insert']>;
      };
    };
  };
}
