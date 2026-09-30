export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Row<T> = T;
type Insert<T, Generated extends keyof T = never, Defaults extends keyof T = never> =
  Omit<T, Generated | Defaults> &
  Partial<Pick<T, Generated | Defaults>>;
type Update<T> = Partial<T>;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Row<{
          id: string;
          display_name: string;
          photo_url: string | null;
          avatar_preset: string | null;
          banner_preset: string | null;
          player_code: string | null;
          last_seen: string | null;
          created_at: string;
          updated_at: string;
        }>;
        Insert: Insert<Database["public"]["Tables"]["profiles"]["Row"], never, "display_name" | "photo_url" | "avatar_preset" | "banner_preset" | "player_code" | "last_seen" | "created_at" | "updated_at">;
        Update: Update<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      player_stats: {
        Row: Row<{
          user_id: string;
          total_matches: number;
          wins: number;
          losses: number;
          win_percentage: number;
          favorite_game: string | null;
          peak_trophies: number;
          highest_rank: string;
          updated_at: string;
        }>;
        Insert: Insert<Database["public"]["Tables"]["player_stats"]["Row"], never, "total_matches" | "wins" | "losses" | "win_percentage" | "favorite_game" | "peak_trophies" | "highest_rank" | "updated_at">;
        Update: Update<Database["public"]["Tables"]["player_stats"]["Row"]>;
      };
      ranked_progress: {
        Row: Row<{
          user_id: string;
          trophies: number;
          weekly_trophies: number;
          week_start: string | null;
          current_rank: string;
          highest_rank: string;
          updated_at: string;
        }>;
        Insert: Insert<Database["public"]["Tables"]["ranked_progress"]["Row"], never, "trophies" | "weekly_trophies" | "week_start" | "current_rank" | "highest_rank" | "updated_at">;
        Update: Update<Database["public"]["Tables"]["ranked_progress"]["Row"]>;
      };
      wallets: {
        Row: Row<{
          user_id: string;
          coins: number;
          total_earned: number;
          total_spent: number;
          created_at: string;
          updated_at: string;
        }>;
        Insert: Insert<Database["public"]["Tables"]["wallets"]["Row"], never, "coins" | "total_earned" | "total_spent" | "created_at" | "updated_at">;
        Update: Update<Database["public"]["Tables"]["wallets"]["Row"]>;
      };
      coin_transactions: {
        Row: Row<{
          id: string;
          user_id: string;
          amount: number;
          type: Database["public"]["Enums"]["coin_transaction_type"];
          source: string;
          description: string;
          created_at: string;
          metadata: Json;
        }>;
        Insert: Insert<Database["public"]["Tables"]["coin_transactions"]["Row"], "id", "created_at" | "metadata">;
        Update: Update<Database["public"]["Tables"]["coin_transactions"]["Row"]>;
      };
      inventory_items: {
        Row: Row<{
          user_id: string;
          item_id: string;
          category: string;
          acquired_at: string;
          source: string | null;
        }>;
        Insert: Insert<Database["public"]["Tables"]["inventory_items"]["Row"], never, "acquired_at" | "source">;
        Update: Update<Database["public"]["Tables"]["inventory_items"]["Row"]>;
      };
      equipped_cosmetics: {
        Row: Row<{
          user_id: string;
          card_back: string;
          table_theme: string;
          profile_frame: string;
          title: string;
          victory_animation: string;
          banner: string;
          updated_at: string;
        }>;
        Insert: Insert<Database["public"]["Tables"]["equipped_cosmetics"]["Row"], never, "card_back" | "table_theme" | "profile_frame" | "title" | "victory_animation" | "banner" | "updated_at">;
        Update: Update<Database["public"]["Tables"]["equipped_cosmetics"]["Row"]>;
      };
      room_cards: {
        Row: Row<{
          id: string;
          user_id: string;
          type: Database["public"]["Enums"]["room_card_type"];
          purchased_at: string;
          activated_at: string | null;
          expires_at: string | null;
          source: string | null;
        }>;
        Insert: Insert<Database["public"]["Tables"]["room_cards"]["Row"], "id", "purchased_at" | "activated_at" | "expires_at" | "source">;
        Update: Update<Database["public"]["Tables"]["room_cards"]["Row"]>;
      };
      user_missions: {
        Row: Row<{
          id: string;
          user_id: string;
          cadence: "daily" | "weekly";
          template_id: string;
          title: string;
          description: string;
          target: number;
          progress: number;
          completed: boolean;
          reward: number;
          reward_cosmetic_id: string | null;
          generated_at: string;
          completed_at: string | null;
        }>;
        Insert: Insert<Database["public"]["Tables"]["user_missions"]["Row"], "id", "progress" | "completed" | "reward_cosmetic_id" | "generated_at" | "completed_at">;
        Update: Update<Database["public"]["Tables"]["user_missions"]["Row"]>;
      };
      user_achievements: {
        Row: Row<{
          user_id: string;
          achievement_id: string;
          progress: number;
          target: number;
          unlocked_at: string | null;
        }>;
        Insert: Insert<Database["public"]["Tables"]["user_achievements"]["Row"], never, "progress" | "target" | "unlocked_at">;
        Update: Update<Database["public"]["Tables"]["user_achievements"]["Row"]>;
      };
      daily_rewards: {
        Row: Row<{
          user_id: string;
          reward_day: number;
          claimed_at: string | null;
          cycle_started_at: string;
        }>;
        Insert: Insert<Database["public"]["Tables"]["daily_rewards"]["Row"], never, "claimed_at" | "cycle_started_at">;
        Update: Update<Database["public"]["Tables"]["daily_rewards"]["Row"]>;
      };
      vip_entitlements: {
        Row: Row<{
          user_id: string;
          active: boolean;
          activated_at: string | null;
          expires_at: string | null;
        }>;
        Insert: Insert<Database["public"]["Tables"]["vip_entitlements"]["Row"], never, "active" | "activated_at" | "expires_at">;
        Update: Update<Database["public"]["Tables"]["vip_entitlements"]["Row"]>;
      };
      friend_requests: {
        Row: Row<{
          id: string;
          from_user_id: string;
          to_user_id: string;
          status: Database["public"]["Enums"]["friend_request_status"];
          created_at: string;
          updated_at: string;
        }>;
        Insert: Insert<Database["public"]["Tables"]["friend_requests"]["Row"], "id", "status" | "created_at" | "updated_at">;
        Update: Update<Database["public"]["Tables"]["friend_requests"]["Row"]>;
      };
      room_invites: {
        Row: Row<{
          id: string;
          from_user_id: string;
          to_user_id: string;
          room_code: string;
          game_type: Database["public"]["Enums"]["game_type"];
          created_at: string;
        }>;
        Insert: Insert<Database["public"]["Tables"]["room_invites"]["Row"], "id", "created_at">;
        Update: Update<Database["public"]["Tables"]["room_invites"]["Row"]>;
      };
      blocks: {
        Row: Row<{
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        }>;
        Insert: Insert<Database["public"]["Tables"]["blocks"]["Row"], never, "created_at">;
        Update: Update<Database["public"]["Tables"]["blocks"]["Row"]>;
      };
      chat_rooms: {
        Row: Row<{
          id: string;
          type: Database["public"]["Enums"]["chat_room_type"];
          created_at: string;
          last_message: string;
          last_message_at: string | null;
          last_sender_id: string | null;
          metadata: Json;
        }>;
        Insert: Insert<Database["public"]["Tables"]["chat_rooms"]["Row"], "id", "created_at" | "last_message" | "last_message_at" | "last_sender_id" | "metadata">;
        Update: Update<Database["public"]["Tables"]["chat_rooms"]["Row"]>;
      };
      chat_participants: {
        Row: Row<{
          room_id: string;
          user_id: string;
          display_name: string;
          last_read_at: string | null;
          joined_at: string;
        }>;
        Insert: Insert<Database["public"]["Tables"]["chat_participants"]["Row"], never, "display_name" | "last_read_at" | "joined_at">;
        Update: Update<Database["public"]["Tables"]["chat_participants"]["Row"]>;
      };
      messages: {
        Row: Row<{
          id: string;
          room_id: string;
          sender_id: string;
          text: string;
          created_at: string;
        }>;
        Insert: Insert<Database["public"]["Tables"]["messages"]["Row"], "id", "created_at">;
        Update: Update<Database["public"]["Tables"]["messages"]["Row"]>;
      };
      clubs: {
        Row: Row<{
          id: string;
          name: string;
          tag: string;
          description: string;
          owner_id: string | null;
          created_at: string;
        }>;
        Insert: Insert<Database["public"]["Tables"]["clubs"]["Row"], "id", "description" | "created_at">;
        Update: Update<Database["public"]["Tables"]["clubs"]["Row"]>;
      };
      club_members: {
        Row: Row<{
          club_id: string;
          user_id: string;
          display_name: string;
          trophies: number;
          role: string;
          joined_at: string;
        }>;
        Insert: Insert<Database["public"]["Tables"]["club_members"]["Row"], never, "display_name" | "trophies" | "role" | "joined_at">;
        Update: Update<Database["public"]["Tables"]["club_members"]["Row"]>;
      };
      club_messages: {
        Row: Row<{
          id: string;
          club_id: string;
          sender_id: string;
          sender_name: string;
          text: string;
          created_at: string;
        }>;
        Insert: Insert<Database["public"]["Tables"]["club_messages"]["Row"], "id", "sender_name" | "created_at">;
        Update: Update<Database["public"]["Tables"]["club_messages"]["Row"]>;
      };
      game_rooms: {
        Row: Row<{
          code: string;
          game_type: Database["public"]["Enums"]["game_type"];
          owner_id: string;
          password_hash: string | null;
          max_players: number;
          status: Database["public"]["Enums"]["room_status"];
          match_id: string | null;
          mode: Database["public"]["Enums"]["room_mode"];
          mindi_mode: Database["public"]["Enums"]["mindi_room_mode"] | null;
          created_at: string;
        }>;
        Insert: Insert<Database["public"]["Tables"]["game_rooms"]["Row"], never, "password_hash" | "status" | "match_id" | "mode" | "mindi_mode" | "created_at">;
        Update: Update<Database["public"]["Tables"]["game_rooms"]["Row"]>;
      };
      room_players: {
        Row: Row<{
          room_code: string;
          user_id: string;
          display_name: string;
          seat_index: number | null;
          joined_at: string;
        }>;
        Insert: Insert<Database["public"]["Tables"]["room_players"]["Row"], never, "display_name" | "seat_index" | "joined_at">;
        Update: Update<Database["public"]["Tables"]["room_players"]["Row"]>;
      };
      room_bans: {
        Row: Row<{
          room_code: string;
          user_id: string;
          created_at: string;
        }>;
        Insert: Insert<Database["public"]["Tables"]["room_bans"]["Row"], never, "created_at">;
        Update: Update<Database["public"]["Tables"]["room_bans"]["Row"]>;
      };
      matchmaking_queue: {
        Row: Row<{
          user_id: string;
          game_type: Database["public"]["Enums"]["game_type"];
          pool: Database["public"]["Enums"]["match_pool"];
          party_id: string | null;
          queued_at: string;
        }>;
        Insert: Insert<Database["public"]["Tables"]["matchmaking_queue"]["Row"], never, "pool" | "party_id" | "queued_at">;
        Update: Update<Database["public"]["Tables"]["matchmaking_queue"]["Row"]>;
      };
      matches: {
        Row: Row<{
          id: string;
          game_type: Database["public"]["Enums"]["game_type"];
          pool: Database["public"]["Enums"]["match_pool"];
          status: Database["public"]["Enums"]["match_status"];
          public_state: Json;
          created_at: string;
          completed_at: string | null;
        }>;
        Insert: Insert<Database["public"]["Tables"]["matches"]["Row"], "id", "pool" | "status" | "public_state" | "created_at" | "completed_at">;
        Update: Update<Database["public"]["Tables"]["matches"]["Row"]>;
      };
      match_players: {
        Row: Row<{
          match_id: string;
          user_id: string;
          seat_index: number;
          team: string | null;
          result: string | null;
          created_at: string;
        }>;
        Insert: Insert<Database["public"]["Tables"]["match_players"]["Row"], never, "team" | "result" | "created_at">;
        Update: Update<Database["public"]["Tables"]["match_players"]["Row"]>;
      };
      player_private_match_state: {
        Row: Row<{
          match_id: string;
          user_id: string;
          private_state: Json;
          updated_at: string;
        }>;
        Insert: Insert<Database["public"]["Tables"]["player_private_match_state"]["Row"], never, "private_state" | "updated_at">;
        Update: Update<Database["public"]["Tables"]["player_private_match_state"]["Row"]>;
      };
      match_events: {
        Row: Row<{
          id: number;
          match_id: string;
          actor_id: string | null;
          event_type: string;
          payload: Json;
          created_at: string;
        }>;
        Insert: Insert<Database["public"]["Tables"]["match_events"]["Row"], "id", "actor_id" | "payload" | "created_at">;
        Update: Update<Database["public"]["Tables"]["match_events"]["Row"]>;
      };
      match_results: {
        Row: Row<{
          match_id: string;
          winner_user_id: string | null;
          winner_team: string | null;
          result: Json;
          created_at: string;
        }>;
        Insert: Insert<Database["public"]["Tables"]["match_results"]["Row"], never, "winner_user_id" | "winner_team" | "result" | "created_at">;
        Update: Update<Database["public"]["Tables"]["match_results"]["Row"]>;
      };
      coin_topup_requests: {
        Row: Row<{
          id: string;
          user_id: string;
          player_name: string;
          coins: number;
          price_mvr: number;
          pack_name: string;
          status: Database["public"]["Enums"]["topup_status"];
          created_at: string;
          decided_at: string | null;
          credited_at: string | null;
        }>;
        Insert: Insert<Database["public"]["Tables"]["coin_topup_requests"]["Row"], "id", "status" | "created_at" | "decided_at" | "credited_at">;
        Update: Update<Database["public"]["Tables"]["coin_topup_requests"]["Row"]>;
      };
      app_config: {
        Row: Row<{
          id: string;
          value: Json;
          updated_at: string;
          updated_by: string | null;
        }>;
        Insert: Insert<Database["public"]["Tables"]["app_config"]["Row"], never, "updated_at" | "updated_by">;
        Update: Update<Database["public"]["Tables"]["app_config"]["Row"]>;
      };
      hall_of_fame_manual: {
        Row: Row<{
          id: string;
          display_name: string;
          peak_trophies: number;
          note: string;
          added_at: string;
          added_by: string | null;
        }>;
        Insert: Insert<Database["public"]["Tables"]["hall_of_fame_manual"]["Row"], "id", "peak_trophies" | "note" | "added_at" | "added_by">;
        Update: Update<Database["public"]["Tables"]["hall_of_fame_manual"]["Row"]>;
      };
      reports: {
        Row: Row<{
          id: string;
          reporter_id: string;
          target_id: string;
          reason: Database["public"]["Enums"]["report_reason"];
          context: Database["public"]["Enums"]["report_context"];
          evidence: string | null;
          details: string | null;
          status: Database["public"]["Enums"]["report_status"];
          created_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
        }>;
        Insert: Insert<Database["public"]["Tables"]["reports"]["Row"], "id", "evidence" | "details" | "status" | "created_at" | "resolved_at" | "resolved_by">;
        Update: Update<Database["public"]["Tables"]["reports"]["Row"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      friend_request_status: "pending" | "accepted" | "declined";
      game_type: "mindi" | "gin_rummy";
      match_pool: "ranked" | "weekend" | "casual";
      match_status: "active" | "completed" | "abandoned";
      room_status: "waiting" | "started" | "closed";
      room_mode: "casual" | "rankedDuo";
      mindi_room_mode: "team2v2" | "ffa1v1";
      coin_transaction_type: "earn" | "spend";
      topup_status: "pending" | "approved" | "rejected" | "credited";
      report_status: "open" | "actioned" | "dismissed";
      report_reason: "harassment" | "hate" | "sexual" | "spam" | "cheating" | "impersonation" | "other";
      report_context: "message" | "club" | "profile" | "match";
      chat_room_type: "dm" | "club";
      room_card_type: "1h" | "3h" | "6h" | "24h" | "1w" | "1m";
    };
    CompositeTypes: Record<string, never>;
  };
}

