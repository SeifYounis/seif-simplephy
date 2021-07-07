# Change Log
All notable changes to this project will be documented in this file.
 
The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/).

## [1.13.0]
- SimplePhy can now be located in a subfolder

## [1.12.0]
- Added the option to edit experiment's configuration
- Added option for consecutive conditions and randomized trials
- Revamped the results section

## [1.11.1] - 2020-09-03
- For MAFC if images do not fit in the screen, only one row is used
- Estimated distance is not saved as `null` if not activated
- Fixed bug when restarting experiment

## [1.11.0] - 2020-08-17
- New: information json file generator
- New: option for showing a fixation grid and ask participants which code they saw after the trial
- New: allowed keys selection is now done using the keyboard
- New: Added option to delete experiment
- Improved timeout behavior
- Switched to `textfield` for `text` type responses, the basic `text` input field remains as `code` type responses in the information file
- When stimuli cannot be loaded, an option to login with Google will show up to avoid bans, feature in testing
- Changed font type
- Relocated checkboxes in experiment options
- Disabled mouse wheel when a popup is showing
- Improved stimuli gathering screen
- Centered option responses
- Fixed bug when loading information json file
- Fixed bug that allowed scrolling before the trial started

## [1.10.0] - 2020-07-28
- New option for sequential images in a trial, replaces first
- Timeouts for sequential images can be separated by commas in the input field
- Added force reload in results section to download from the cloud
- Keys pressed are now stored in an array with their corresponding timestamp
- Fixed scrolling data reset
- Fixed stimulus size in participant's file
- Improved results' password interface

## [1.9.1] - 2020-07-27
- Added option to delete participants
- Added some error handling when loading participant data and trials
- Fixed bug with saving distance

## [1.9.0] - 2020-07-23
- Results backend has been completely rewritten
- Added more security measures
- Revamped Results page to speed up loading time

## [1.8.1] - 2020-07-22
- Timeout trials will not terminate when pressing a key
- Input fields are now sanitized

## [1.8.0] - 2020-07-21
- Added the option `correctKey` to give feedback
- Added the option `correctResponse` to give feedback

## [1.7.0] - 2020-07-17
- MAFC trials can be placed in a circle
- Fixed bug with condition change and slice number

## [1.6.1] - 2020-07-13
- Block Start button until experiment is loaded
- Fixed bug when restarting after experiment is cancelled

## [1.6.0] - 2020-07-06
- Added a list of created experiments
- Fixed some bugs with cookies and experiment resume
- Blocked mouse wheel when running experiment
- Fixed test/default experiment
- Cleaned up the home screen when an experiment is loaded
- Images loaded directly from Google Drive with a delay
- Added FTP integration with Gitlab
- Added scrolling information to the results
- Better developer mode

## [1.5.1] - 2020-06-24
- Recalibration shows a continue screen when finished
- Pressing `Enter` for video stimuli will record the time and status of the video

## [1.5.0] - 2020-06-23
- Added option to download results in `CSV` format

## [1.4.2] - 2020-06-22
- Bug fixes for new server

## [1.4.1] - 2020-06-19
- Added some security measurements
- Fixed bugs on results section

## [1.4.0] - 2020-06-18
- Added a cookie to resume an experiment for returning participants
- Added option to allow different keys to terminate the trial ``space`` is the default, see more keycodes in [KeyCode.info](https://keycode.info/)
- Closing the window or reloading while running an experiment will show a confirmation dialog
- Added option for recalibration interval or disabling calibration
- Added two new ratings at the end of the slider for 50 and 100 ratings
- Added new randomization options for blocked conditions and trials
- Safety check for mobile devices and uncompatible browsers

## [1.3.0] - 2020-06-12
- New response type: ``select``
- Window shows experiment title when loading

## [1.2.0] - 2020-06-11
- New response type: ``text``
- Bug fixes when responding

## [1.1.0] - 2020-06-10
- Moved storage to Firebase
- Colored marks pressing ``SHIFT``, ``CTRL`` or ``ALT``
- Fixed double click bug
- Fixed stimulus size

## [1.0.1] - 2020-06-09
- Bug fixes

## [1.0.0] - 2020-06-03
- First stable version