const { Command } = require("commander");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

const program = new Command();

program
  .requiredOption("-u, --url <url>", "URL to download")
  .requiredOption("-f, --filename <filename>", "Output filename")
  .parse(process.argv);

let isProgressStarted = false;

// Display help if no arguments are passed
if (!process.argv.slice(2).length) {
  program.outputHelp();
  process.exit(1);
}

const { url, filename } = program.opts();

// Function to ensure the directory exists
function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

// Function to download video using ffmpeg
async function downloadVideo(url, filename) {
  const chalk = await import("chalk");

  try {
    console.log(chalk.default.dim('[URL]: '), chalk.default.green(`"${chalk.default.bold(url)}"\n`));

    require("fluent-ffmpeg"); // Requiring fluent-ffmpeg

    ffmpeg(url)
      .outputOptions("-c copy") // Hardcoding the -c copy flag
      .output(filename)
      .on("start", (commandLine) => {
        console.log(
          chalk.default.dim("[FFMPEG COMMAND]: "),
          chalk.default.green(`"${chalk.default.bold(commandLine)}"\n`)
        );
      })
      .on("stderr", (stderrLine) => {
        if (isProgressStarted) {
          // stderr still prints logs after progress is successfully printing, hence cock blocking it here
          return;
        }
        console.log(
          chalk.default.dim("[FFMPEG STDERR]: "),
          chalk.default.magenta(`${stderrLine}`)
        ); // Logging FFmpeg stderr
      })
      .on("progress", (progress) => {
        isProgressStarted = true;
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        // process.stdout.write(
        //     `${chalk.default.dim("[STATS]: ")} ${chalk.default.green(
        //         progress.percent ? progress.percent.toFixed(2) : 0
        //       )} %`
        // );
        stats(progress, chalk);
        // console.log(progress)
      })
      .on("end", () => {
        console.log(chalk.default.green("\n[DOWNLOAD COMPLETED]"));
      })
      .on("error", (err) => {
        console.error(
          chalk.default.red(
            "\nAn error occurred during processing: " + err.message
          )
        );
      })
      .run();
  } catch (error) {
    console.error(chalk.default.red("An error occurred: " + error.message));
  }
}

async function main() {
  // Ensure the output directory exists
  try {
    ensureDirectoryExistence(filename);
    // Start the download
    downloadVideo(url, filename);
  } catch (error) {
    const chalk = await import("chalk");
    console.error(
      chalk.default.red(
        "An error occurred while creating directories: " + error.message
      )
    );
    process.exit(1);
  }
}

main();






function stats(progress, chalk){
    try {
        const totalSizeOfFile = progress.targetSize || 0;
        const percent = progress.percent ? progress.percent.toFixed(2) : 0;
        const downloadedSize = (percent + totalSizeOfFile > 0) ? (percent * totalSizeOfFile)/100 : 0;
        const currentKbps = progress.currentKbps || 0;
        const speed = currentKbps + 'Kbps';
        const downloadedSizeInMb = downloadedSize ? (downloadedSize / 1024).toFixed(2) : 0;
        const totalSizeOfFileInMb = totalSizeOfFile ?(totalSizeOfFile / 1024).toFixed(2) : 0;
        // estimated time remaining
        let etr = 0;
        if(totalSizeOfFile && downloadedSize){
            const etr_in_seconds = (totalSizeOfFile - downloadedSize) / currentKbps;
            const etr_in_mins = etr_in_seconds / 60;
            etr = isFloat(etr_in_seconds) ?  etr_in_mins.toFixed(2) + ' Mins' : etr_in_seconds + ' Mins'
        }
 
          process.stdout.write(
            `${chalk.default.dim("[STATS]: ")} Progress: ${chalk.default.green(
                percent
              )} % | Downloaded: ${downloadedSizeInMb} MB   |   Total: ${totalSizeOfFileInMb} MB   |   ETR: ${etr}`
        );
    } catch (error) {
        console.error('Error in stats fn', error.message);
    }
}



function isFloat(n){
    return Number(n) === n && n % 1 !== 0;
}