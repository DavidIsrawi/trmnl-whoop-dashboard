import axios from 'axios';
import qs from 'qs';

export interface WhoopTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface WhoopRecovery {
  score: {
    recovery_score: number;
    resting_heart_rate: number;
    hrv_rmssd_milli: number;
    spo2_percentage?: number;
    skin_temp_celsius?: number;
  };
}

export interface WhoopSleep {
  score: {
    sleep_performance_percentage: number;
    sleep_efficiency_percentage?: number;
    respiratory_rate?: number;
  };
}

export interface WhoopCycle {
  score: {
    strain: number;
    average_heart_rate: number;
    kilojoule?: number;
  };
}

export class WhoopClient {
  private clientId: string;
  private clientSecret: string;
  private refreshToken: string;
  private accessToken: string | null = null;

  constructor(clientId: string, clientSecret: string, refreshToken: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.refreshToken = refreshToken;
  }

  async refreshAccessToken(): Promise<WhoopTokenResponse> {
    const data = qs.stringify({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'offline',
    });

    const response = await axios.post('https://api.prod.whoop.com/oauth/oauth2/token', data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    this.accessToken = response.data.access_token;
    this.refreshToken = response.data.refresh_token;

    return response.data;
  }

  async getLatestRecovery(): Promise<WhoopRecovery | undefined> {
    if (!this.accessToken) await this.refreshAccessToken();
    const response = await axios.get('https://api.prod.whoop.com/developer/v2/recovery', {
      headers: { Authorization: `Bearer ${this.accessToken}` },
      params: { limit: 1 },
    });
    return response.data.records[0];
  }

  async getLatestSleep(): Promise<WhoopSleep | undefined> {
    if (!this.accessToken) await this.refreshAccessToken();
    const response = await axios.get('https://api.prod.whoop.com/developer/v2/activity/sleep', {
      headers: { Authorization: `Bearer ${this.accessToken}` },
      params: { limit: 1 },
    });
    return response.data.records[0];
  }

  async getLatestCycle(): Promise<WhoopCycle | undefined> {
    if (!this.accessToken) await this.refreshAccessToken();
    const response = await axios.get('https://api.prod.whoop.com/developer/v2/cycle', {
      headers: { Authorization: `Bearer ${this.accessToken}` },
      params: { limit: 1 },
    });
    return response.data.records[0];
  }

  async getWeeklyStrainAverage(): Promise<number | undefined> {
    if (!this.accessToken) await this.refreshAccessToken();
    const response = await axios.get('https://api.prod.whoop.com/developer/v2/cycle', {
      headers: { Authorization: `Bearer ${this.accessToken}` },
      params: { limit: 7 },
    });
    const records = response.data.records;
    if (!records || records.length === 0) return undefined;
    const sum = records.reduce((acc: number, record: any) => acc + (record.score?.strain || 0), 0);
    return sum / records.length;
  }

  getUpdatedRefreshToken() {
    return this.refreshToken;
  }
}
