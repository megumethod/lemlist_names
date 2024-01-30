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

async function getLeads(campaign: string, mappings: string[][]) {
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

    const possibilities = mappings.filter((m) => {
      return m[0] === lead.firstName;
    });

    var name = capitalizeFirstLetter(vokativ.vokativ(lead['firstName']));

    if (possibilities.length > 0) {
      possibilities.push([lead.firstName, name]);
      name = await inquirer.prompt([
        {
          type: 'list',
          name: 'name',
          message: `Select name for ${lead.firstName} (${lead.email})`,
          choices: possibilities.map((c) => c[1]),
        },
      ]);
    }

    await updateLead(campaign, lead.email, {
      _callout: name,
    });
    console.log(`Updating ${lead['firstName']} to ${name}).`);
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

  let mappings: string[][] = [];

  for (const campaign of campaigns) {
    const response = await fetch(
      `https://api.lemlist.com/api/campaigns/${campaign._id}/export/leads?state=all&access_token=${process.env.LEMLIST_API}`,
    );

    const body = await response.text();
    const parsed = parse(body, {
      columns: true,
      skip_empty_lines: true,
      quote: '"',
      delimiter: ',',
      trim: true,
    });
    mappings.push(
      ...parsed
        .map((lead) => {
          if (
            lead.firstName === '' ||
            lead['_callout'] === undefined ||
            lead['_callout']?.length == 0
          )
            return undefined;

          return [lead.firstName, lead['_callout']];
        })
        .filter((lead) => lead !== undefined),
    );
  }

  for (var i = 0; i < mappings.length; i++) {
    if (
      mappings.filter(
        (m) =>
          m !== undefined && m[0] === mappings[i][0] && m[1] === mappings[i][1],
      ).length > 1
    ) {
      mappings[i] = undefined;
    }
  }

  mappings = mappings.filter((m) => m !== undefined);

  const campaign = await inquirer.prompt([
    {
      type: 'list',
      name: 'campaign',
      message: 'Select campaign',
      choices: campaigns.map((c) => {
        return {
          arguments: c._id,
          name: c.name,
          value: c._id,
        };
      }),
    },
  ]);
  await getLeads(campaign.campaign, mappings);
}

if (require.main === module) {
  run();
}
