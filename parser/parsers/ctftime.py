from bs4 import BeautifulSoup
import requests
import json


def isGood(fields):
    # print(fields)
    if fields[3].get_text(strip=True) == "On-line":
        return False
    else:
        if fields[3].get_text(strip=True) == "":
            return False
        else:
            return (getCity(False, fields))[0]


def getCity(isOnline, fields):
    if not isOnline:
        country_city = fields[3].get_text(strip=True).split(",")
        return country_city[0].strip() == "Russia", country_city[1].strip()
    else:
        return True, "MOCK CITY"


def getData():
    base_url = "https://ctftime.org"
    url = f"{base_url}/event/list/upcoming"
    data = requests.get(url, headers={
                        'User-Agent': "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36"})
    # print(data.text)
    soup = BeautifulSoup(data.text, "lxml")

    ctf_table = soup.find("table", class_="table table-striped")
    if ctf_table is None:
        raise RuntimeError('unknown error during parsing of the html')
    # print(ctf_table)
    output = []
    isFirstLine = True
    for ctf in ctf_table.children:
        if isFirstLine:
            isFirstLine = False
            continue
        # print("--------------------------------------")
        # print(ctf)
        fields = ctf.find_all("td")
        # print(ctf.find_all("td"))
        if isGood(fields):
            isOnline = fields[3].get_text(strip=True) == "On-line"
            output.append({
                'name': fields[0].find('a').get_text(strip=True),
                'eventURL': f"{base_url}{fields[0].find('a')['href']}",
                'type': fields[2].get_text(strip=True),
                'isOnline': isOnline,
                'City': (getCity(isOnline, fields))[1]
            })
    return output


if __name__ == "__main__":
    print(json.dumps(getData()))
