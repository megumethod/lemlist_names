Vocative generator for Czech names for Lemlist
==============================================

This is a simple script that generates vocative forms of Czech names for Lemlist.

This script updates the names from `firstName` column to `_callout`. 
It won't update the names if the `_callout` column is not empty.

## Installation

Clone the repository, install dependencies and build the script:

```bash
npm install
npm run build
```

Get your Lemlist API key and put it into `.env` file. (See `.env.example` for reference.)

## Usage

Start the script:

```bash
npm start
```

You'll be promted to select a campaign where the names will be updated.
