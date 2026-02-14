import axios from 'axios';

export class TrmnlClient {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async pushData(data: any) {
    const response = await axios.post(this.webhookUrl, {
      merge_variables: data,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  }
}
