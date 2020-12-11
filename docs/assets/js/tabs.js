function showTab(evt, tabName) {
  const clickedTabLink = evt.currentTarget;
  const tabLinkDiv = clickedTabLink.parentNode;
  const tabContentContainer = tabLinkDiv.nextElementSibling;

  // Get all elements with class="tabcontent" and hide them
  for (const tabContent of tabContentContainer.querySelectorAll('.tabcontent')) {
    tabContent.className = tabContent.className.split(' ').map(x => x.trim()).filter(x => x !== 'active').join(' ');
  }

  // Get all elements with class="tablinks" and remove the class "active"
  for (const tabLink of tabLinkDiv.querySelectorAll('.tablinks')) {
    tabLink.className = tabLink.className.split(' ').map(x => x.trim()).filter(x => x !== 'active').join(' ');
  }

  // Show the current tab, and add an "active" class to the button that opened the tab
  document.querySelector(`[data-tab=${tabName}]`).className += " active";
  clickedTabLink.className += " active";
}
