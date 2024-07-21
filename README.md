A chrome extension that lets you group issues in a GitHub milestone.

Works with [Everhour](https://everhour.com/) to calculate the estimated total hours per group.

<img width="753" alt="Brave Browser 2024-07-21 19 13 35" src="https://github.com/user-attachments/assets/849ce56e-729b-49b9-b892-2db5a6fb05af">

## Known Issues

- Does not re-render when a new issue is added to the milestone in another tab or Everhour estimates change.
- Cannot drop an issue as the _first issue_ in a group. This does not work because GitHub's drop handler updates the priority based on the issue directly above the dropped issue, but it cannot recognize the "foreign" milestone group.
  - **Workaround:** Drop the issue one down from its intended destination, and then move the milestone group down one.
