import { parse } from 'csv-parse/sync';
import { writeFileSync } from 'fs';
import * as inquirer from 'inquirer';
import * as vokativ from 'vokativ';

function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

async function updateLead(
  campaign: string,
  email: string,
  data: Record<string, string>,
) {
  const response = await fetch(
    `https://api.lemlist.com/api/campaigns/${campaign}/leads/${email}?access_token=${process.env.LEMLIST_API}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data, null, 2),
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  console.log(await response.json());
}

async function getLeads(campaign: string) {
  const response = await fetch(
    `https://api.lemlist.com/api/campaigns/${campaign}/export/leads?state=all&access_token=${process.env.LEMLIST_API}`,
  );

  const body = await response.text();
  writeFileSync('leads.csv', body);
  const parsed = parse(body, {
    columns: true,
    skip_empty_lines: true,
    quote: '"',
    delimiter: ',',
    trim: true,
  });
  for (const lead of parsed) {
    if (
      lead.email === '' ||
      lead.firstName === '' ||
      lead['_callout']?.length > 0
    )
      continue;

    await updateLead(campaign, lead.email, {
      _callout: capitalizeFirstLetter(vokativ.vokativ(lead['firstName'])),
    });
    console.log(
      `Updating ${lead['firstName']} to ${capitalizeFirstLetter(
        vokativ.vokativ(lead['firstName']),
      )}`,
    );
  }
}

async function getCampaigns(): Promise<
  {
    _id: string;
    archived?: boolean;
    name: string;
  }[]
> {
  const response = await fetch(
    `https://api.lemlist.com/api/campaigns?access_token=${process.env.LEMLIST_API}`,
  );
  return await response.json();
}

async function run() {
  const campaigns = await getCampaigns();

  const campaign = await inquirer.prompt([
    {
      type: 'list',
      name: 'campaign',
      message: 'Select campaign',
      choices: campaigns.map((c) => c.name),
    },
  ]);
  await getLeads(campaign.campaign);
}

if (require.main === module) {
  run();
}
