
// This script is meant to speed up workflow. Please use appropriately.

// © 2023 Jining Liu
// All Rights Reserved

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import clipboard from 'clipboardy';
import cliSelect from 'cli-select';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
    try {

        const args = process.argv.slice(2);

        if (args.length != 1) {
            throw 'Please provide a file path as the only argument.'
        }

        const filePath = args[0];

        if (!filePath.endsWith('.csv')) {
            throw 'File must be in CSV format.';
        }

        try {

            const data = await fs.readFile(filePath, 'utf8');
            const rows = data.split(/[\r\n]+/);
            const columns = rows.shift().split(',');

            console.log('\nSelect the key (data) that is unique to each item (a.k.a. the one you want to identify duplicates with):');
            cliSelect({
                values: columns, valueRenderer: (value, selected) => {
                    if (selected) {
                        return chalk.underline(chalk.green(value));
                    }
                    return chalk.red(value);
                }
            }).then((keySelectResult) => {
                const forKey = keySelectResult.value;
                const keyIndex = columns.indexOf(forKey);
                console.log(chalk.green(forKey));
                console.log('\nSelect the value (data) that you want to sum up:');
                cliSelect({
                    values: columns.filter(e => e != forKey), valueRenderer: (value, selected) => {
                        if (selected) {
                            return chalk.underline(chalk.green(value));
                        }
                        return chalk.red(value);
                    }
                }).then(async (valueSelectResult) => {

                    const forValue = valueSelectResult.value;
                    const valueIndex = columns.indexOf(forValue);
                    console.log(chalk.green(forValue));

                    let result = [];

                    rows.forEach(row => {
                        const values = row.split(',');
                        const id = values[keyIndex];
                        values[valueIndex] = parseInt(values[valueIndex]);
                        if (result.map(e => e[keyIndex]).filter(e => e == id).length == 1) {
                            result.find(e => e[keyIndex] == id)[valueIndex] += values[valueIndex];
                        } else {
                            result.push(values);
                        }
                    });

                    const output = columns.join(',') + '\n' + result.map(e => e.map(e => e.toString()).join(',')).join('\n');
                    const copiable = output.replace(/,/g, '	');

                    try {

                        const dirDate = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
                        const newDir = path.join(__dirname, dirDate);

                        await fs.mkdir(newDir);
                        await fs.writeFile(path.join(newDir, 'original.csv'), data, 'utf8');
                        await fs.writeFile(path.join(newDir, 'result.csv'), output, 'utf8');
                        await fs.writeFile(path.join(newDir, 'copiable.csv'), copiable, 'utf8');
                        console.log(chalk.green('\nSuccess! File is saved to "' + dirDate + '/result.csv".'));

                        console.log('\nCopy pastable data to clipboard?');
                        cliSelect({
                            values: ['Yes', 'No'], valueRenderer: (value, selected) => {

                                if (selected) {
                                    return chalk.underline(value === 'Yes' ? chalk.green(value) : chalk.red(value));
                                }

                                return value === 'Yes' ? chalk.green(value) : chalk.red(value);
                            }
                        }).then(async (result) => {
                            console.log(result.value == 'Yes' ? chalk.green('Yes') : chalk.red('No'));
                            if (result.value == 'Yes') {
                                await clipboard.write(copiable);
                            }
                            console.log(chalk.bgBlue('\nDone! Script ending...'));
                        });

                    } catch (e) {
                        throw 'Failed to write data to final destination.\n' + chalk.red(e);
                    }

                });
            });

        } catch (e) {
            throw 'Failed to read file at "' + filePath + '".\n' + chalk.red(e);
        }

    } catch (e) {
        console.log(chalk.red('Error: ') + chalk.underline(e));
        console.log(chalk.underline(chalk.gray('The error has caused the script to end.\n')));
    }
})();