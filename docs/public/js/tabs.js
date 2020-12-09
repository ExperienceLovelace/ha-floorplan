function showTab(evt, tabName) {
  const clickedTabLink = evt.currentTarget;
  const tab = clickedTabLink.parentNode;

  // Get all elements with class="tabcontent" and hide them
  let tabContent = tab.previousElementSibling;
  while (tabContent && tabContent.classList.contains('tabcontent')) {
    tabContent.className = tabContent.className.replace(/ active/g, "");
    tabContent.className = tabContent.className.replace(/active /g, "");
    tabContent.className = tabContent.className.replace(/active/g, "");
    tabContent = tabContent.previousElementSibling;
  }
  tabContent = tab.nextElementSibling;
  while (tabContent && tabContent.classList.contains('tabcontent')) {
    tabContent.className = tabContent.className.replace(/ active/g, "");
    tabContent.className = tabContent.className.replace(/active /g, "");
    tabContent.className = tabContent.className.replace(/active/g, "");
    tabContent = tabContent.nextElementSibling;
  }
  
  // Get all elements with class="tablinks" and remove the class "active"
  let tabLink = clickedTabLink.previousElementSibling;
  while (tabLink && tabLink.classList.contains('tablinks')) {
    tabLink.className = tabLink.className.replace(/ active/g, "");
    tabLink.className = tabLink.className.replace(/active /g, "");
    tabLink.className = tabLink.className.replace(/active/g, "");
    tabLink = tabLink.previousElementSibling;
  }
  tabLink = clickedTabLink.nextElementSibling;
  while (tabLink && tabLink.classList.contains('tablinks')) {
    tabLink.className = tabLink.className.replace(/ active/g, "");
    tabLink.className = tabLink.className.replace(/active /g, "");
    tabLink.className = tabLink.className.replace(/active/g, "");
    tabLink = tabLink.nextElementSibling;
  }

  // Show the current tab, and add an "active" class to the button that opened the tab
  document.getElementById(tabName).className += " active";
  clickedTabLink.className += " active";
}
