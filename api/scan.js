<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Barcode Scanner</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js"></script>
</head>
<body>
    <h1>바코드 스캐너</h1>
    <div id="interactive" style="width: 100%; height: 400px;"></div>
    <div id="result"></div>
    
    <script>
        // QuaggaJS 라이브러리 초기화
        Quagga.init({
            inputStream: {
                type: "LiveStream",
                constraints: {
                    facingMode: "environment" // 후면 카메라 사용
                },
                target: document.querySelector('#interactive') // 비디오 스트림을 표시할 요소
            },
            decoder: {
                readers: ["code_128_reader", "ean_reader", "ean_8_reader", "code_39_reader", "upc_reader"] // 인식할 바코드 형식
            }
        }, function(err) {
            if (err) {
                console.log(err);
                return;
            }
            console.log("Quagga 시작!");
            Quagga.start();
        });

        // 바코드 인식 이벤트 리스너
        Quagga.onDetected(async function(data) {
            const barcode = data.codeResult.code; // 인식된 바코드 코드
            document.getElementById('result').innerText = `인식된 바코드: \${barcode}`; // 결과 표시
            console.log(`인식된 바코드: \${barcode}`);

            // 서버에 바코드 전송
            const response = await fetch('/api/scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ barcode })
            });

            const drinkData = await response.json();
            if (response.ok) {
                // 주류 정보 표시
                document.getElementById('result').innerText = JSON.stringify(drinkData, null, 2);
            } else {
                // 에러 메시지 표시
                document.getElementById('result').innerText = `에러: \${drinkData.error}`;
            }
        });
    </script>
</body>
</html>
