function is_mobile_device() {
    const userAgent = navigator.userAgent;
    return /^(?:(iPad|iPhone|iPod|Android|BlackBerry|PlayBook|Nexus|BB10|Mobile|IEMobile|Kindle Fire|Windows Phone|webOS|Open WebOS|Opera Mini|Opera Mobi|UCBrowser|Chrome Mobi|MeeGo|Minimo|Archos)|Symbian|Series 40|windows ce|Nokia|SonyEricsson|webOS DEVICE|SCH-i800|SCH-i900|7800|8800|Series60|Toshiba|LG| blackberry)/i.test(userAgent);
}

if (is_mobile_device()) {
    window.location.href = "index_mobile.html"; // Replace with your mobile-specific URL
}
