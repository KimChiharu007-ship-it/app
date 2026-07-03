/*
 * 医師国家試験 練習問題データ
 * ---------------------------------------------------------------------------
 * ※ 本データは学習用に作成したオリジナルの練習問題です。実際の国家試験の
 *    過去問そのものではありません。医学的内容は一般的な標準治療に基づいて
 *    いますが、学習の入口として利用し、最終的な確認は成書・ガイドラインで
 *    行ってください。
 *
 * 各問題オブジェクトの構造:
 *   id         : 一意なID
 *   subject    : 科目（フィルタ・集計に使用）
 *   topic      : 単元・テーマ
 *   importance : 重要度 3=必修級 / 2=頻出 / 1=標準
 *   type       : "single"（1つ選べ） / "multiple"（2つ選べ 等）
 *   pick       : multiple のとき選ぶ数
 *   stem       : 問題文
 *   image      : 画像（任意）。URL または data URI（例：X線・心電図・写真・シェーマ）
 *   imageAlt   : 画像の代替テキスト（任意）
 *   choices    : 選択肢配列
 *       text     : 選択肢テキスト
 *       correct  : 正答なら true
 *       forbidden: 禁忌選択肢なら true（本番なら不合格級の致命的誤答）
 *       note     : その選択肢の簡潔な解説（任意）
 *   explanation: 全体解説
 *   pearl      : 覚えておきたい一言（禁忌のポイント等）
 */

window.QUESTIONS = [
  {
    id: "cir-001",
    subject: "循環器",
    topic: "気管支喘息と降圧薬",
    importance: 3,
    type: "single",
    stem: "気管支喘息の既往がある58歳男性。高血圧に対して降圧薬を開始する。適切な薬剤はどれか。1つ選べ。",
    choices: [
      { text: "プロプラノロール（非選択的β遮断薬）", correct: false, forbidden: true,
        note: "非選択的β遮断は気管支平滑筋のβ2を遮断し、致死的な喘息発作を誘発しうる。喘息患者には禁忌。" },
      { text: "アムロジピン（Ca拮抗薬）", correct: true, forbidden: false,
        note: "気道への悪影響がなく、喘息合併高血圧の第一選択になりうる。" },
      { text: "エナラプリル（ACE阻害薬）", correct: false, forbidden: false,
        note: "空咳の副作用はあるが禁忌ではない。ただし本問では喘息への安全性からCa拮抗薬が最適。" },
      { text: "ロサルタン（ARB）", correct: false, forbidden: false,
        note: "喘息には安全で許容されるが、本問の最適解はCa拮抗薬。" }
    ],
    explanation: "気管支喘息患者に非選択的β遮断薬を投与すると重篤な気管支攣縮を招く。喘息合併の高血圧ではCa拮抗薬やARB/ACE阻害薬を選ぶ。",
    pearl: "【禁忌】喘息 × 非選択的β遮断薬。反射的に「β遮断薬は避ける」と結び付ける。"
  },
  {
    id: "cir-002",
    subject: "循環器",
    topic: "WPW症候群 + 心房細動",
    importance: 2,
    type: "single",
    stem: "WPW症候群の患者が心房細動を発症し、幅広いQRSの頻拍を呈している。避けるべき薬剤はどれか。1つ選べ。",
    choices: [
      { text: "ジゴキシン", correct: false, forbidden: true,
        note: "房室結節を抑制し副伝導路優位となり、心室細動へ移行させうる。WPW+Afでは禁忌。" },
      { text: "プロカインアミド", correct: true, forbidden: false,
        note: "副伝導路の伝導を抑制でき、WPW+Afの薬物治療として妥当。" },
      { text: "ベラパミル", correct: false, forbidden: false,
        note: "房室結節抑制薬でありWPW+Afでは避ける（危険側）。" },
      { text: "電気的除細動（血行動態不安定時）", correct: false, forbidden: false,
        note: "不安定なら第一選択。設問は『避けるべき薬剤』を問う。" }
    ],
    explanation: "WPW症候群に合併した心房細動では、房室結節を抑制する薬（ジギタリス・ベラパミル・βブロッカー）は副伝導路を介した心室応答を増悪させ心室細動を誘発しうる。",
    pearl: "【禁忌】WPW + Af に房室結節抑制薬（ジギタリス・Ca拮抗薬）。"
  },
  {
    id: "end-001",
    subject: "内分泌",
    topic: "褐色細胞腫の術前管理",
    importance: 2,
    type: "single",
    stem: "褐色細胞腫の患者。手術に向けた降圧管理として、まず開始すべき薬剤はどれか。1つ選べ。",
    choices: [
      { text: "β遮断薬を単独で先行投与", correct: false, forbidden: true,
        note: "α遮断なしのβ遮断は血管拡張性のβ2を抑え、相対的にα刺激が優位となり高血圧クリーゼを招く。単独先行は禁忌。" },
      { text: "α遮断薬（フェノキシベンザミン等）", correct: true, forbidden: false,
        note: "まずαを十分に遮断し、その後必要ならβ遮断を追加するのが原則。" },
      { text: "利尿薬単独", correct: false, forbidden: false, note: "循環血漿量減少はむしろ有害になりうる。" },
      { text: "無治療で手術", correct: false, forbidden: false, note: "術中のカテコラミン放出でクリーゼの危険。" }
    ],
    explanation: "褐色細胞腫では『αブロック先行 → βブロック後追い』が鉄則。順序を誤ると高血圧クリーゼを起こす。",
    pearl: "【禁忌/順序】褐色細胞腫でβ遮断薬を先に使わない。αが先。"
  },
  {
    id: "obg-001",
    subject: "産婦人科",
    topic: "妊婦への禁忌薬",
    importance: 3,
    type: "multiple",
    pick: 2,
    stem: "妊娠中の投与が禁忌となる薬剤はどれか。2つ選べ。",
    choices: [
      { text: "ワルファリン", correct: true, forbidden: true,
        note: "胎盤を通過し胎児ワルファリン症候群・出血を起こす。妊娠中は原則ヘパリンに変更。" },
      { text: "エナラプリル（ACE阻害薬）", correct: true, forbidden: true,
        note: "胎児の腎障害・羊水過少・頭蓋形成不全。妊娠中（特に中後期）禁忌。" },
      { text: "メチルドパ", correct: false, forbidden: false, note: "妊娠高血圧で使用される安全性の高い降圧薬。" },
      { text: "インスリン", correct: false, forbidden: false, note: "妊娠糖尿病でも安全に使用できる。" }
    ],
    explanation: "妊娠中禁忌の代表：ワルファリン、ACE阻害薬/ARB、テトラサイクリン、レチノイド、一部の抗てんかん薬など。",
    pearl: "【禁忌】妊婦 × ワルファリン・ACE阻害薬/ARB・テトラサイクリン。"
  },
  {
    id: "gas-001",
    subject: "消化器",
    topic: "消化管穿孔の疑いと造影",
    importance: 2,
    type: "single",
    stem: "上部消化管穿孔が疑われる患者に消化管造影を行う。使用してはならない造影剤はどれか。1つ選べ。",
    choices: [
      { text: "硫酸バリウム", correct: false, forbidden: true,
        note: "穿孔部から腹腔内へ漏れると重篤なバリウム腹膜炎を起こす。穿孔（疑い）では禁忌。" },
      { text: "水溶性造影剤（ガストログラフィン）", correct: true, forbidden: false,
        note: "漏出しても吸収され、穿孔疑い例で選択される。" },
      { text: "造影を行わずCTで評価", correct: false, forbidden: false, note: "妥当な代替だが設問は造影剤の可否を問う。" },
      { text: "生理食塩水", correct: false, forbidden: false, note: "造影剤ではない。" }
    ],
    explanation: "消化管穿孔（疑い）・腸閉塞では硫酸バリウムは禁忌。漏出時のバリウム腹膜炎、あるいはバリウムイレウスを招く。水溶性造影剤を用いる。",
    pearl: "【禁忌】穿孔・イレウス疑い × バリウム。水溶性造影剤に。"
  },
  {
    id: "emg-001",
    subject: "救急",
    topic: "アナフィラキシーの第一選択",
    importance: 3,
    type: "single",
    stem: "食物摂取後に全身蕁麻疹・喘鳴・血圧低下を呈した患者。まず投与すべき薬剤はどれか。1つ選べ。",
    choices: [
      { text: "アドレナリン筋注（大腿外側）", correct: true, forbidden: false,
        note: "アナフィラキシーの第一選択。迷わず筋注する。" },
      { text: "まず抗ヒスタミン薬とステロイドのみで様子を見る", correct: false, forbidden: true,
        note: "アドレナリンを遅らせる/使わない判断は致死的遅延となる。第一選択を外すのは重大な誤り。" },
      { text: "経過観察し自然軽快を待つ", correct: false, forbidden: true,
        note: "血圧低下・気道症状を放置するのは致命的。" },
      { text: "アドレナリンを静脈内へ急速静注（心停止でないのに）", correct: false, forbidden: false,
        note: "非心停止例での安易な静注は不整脈リスク。基本は筋注。" }
    ],
    explanation: "アナフィラキシーの第一選択はアドレナリン筋注。抗ヒスタミン薬・ステロイドは補助であり、これらを優先してアドレナリンを遅らせてはならない。",
    pearl: "【必修】アナフィラキシー＝アドレナリン筋注をためらわない。"
  },
  {
    id: "cir-003",
    subject: "循環器",
    topic: "ジギタリス中毒",
    importance: 2,
    type: "single",
    stem: "ジギタリス中毒による不整脈と高カリウム血症を認める患者。避けるべき治療はどれか。1つ選べ。",
    choices: [
      { text: "カルシウム製剤の静注", correct: false, forbidden: true,
        note: "ジギタリス中毒に高用量Ca静注は『stone heart』（強直性収縮）を招くとされ避ける。" },
      { text: "ジギタリス特異的抗体（Fab）", correct: true, forbidden: false,
        note: "重症ジギタリス中毒の特異的治療。" },
      { text: "カリウム値の補正・モニタリング", correct: false, forbidden: false, note: "適切な支持療法。" },
      { text: "不整脈に対する対症療法", correct: false, forbidden: false, note: "必要に応じ行う。" }
    ],
    explanation: "ジギタリス中毒では細胞内Ca過負荷が背景にあり、Ca静注は致死的な収縮異常を招きうるため避ける。重症例はジギタリス特異抗体で治療。",
    pearl: "【禁忌】ジギタリス中毒 × Ca製剤静注。"
  },
  {
    id: "neu-001",
    subject: "神経",
    topic: "重症筋無力症で避ける薬",
    importance: 2,
    type: "single",
    stem: "重症筋無力症の患者。神経筋伝達を悪化させ、症状を増悪させうる薬剤はどれか。1つ選べ。",
    choices: [
      { text: "アミノグリコシド系抗菌薬", correct: true, forbidden: true,
        note: "神経筋接合部の伝達を抑制し筋力低下・呼吸抑制を悪化させる。重症筋無力症では避ける。" },
      { text: "ピリドスチグミン", correct: false, forbidden: false, note: "コリンエステラーゼ阻害薬で治療薬。" },
      { text: "アセトアミノフェン", correct: false, forbidden: false, note: "神経筋伝達への影響はない。" },
      { text: "経口補水", correct: false, forbidden: false, note: "問題ない。" }
    ],
    explanation: "重症筋無力症では神経筋伝達を抑える薬（アミノグリコシド、一部の抗不整脈薬、筋弛緩薬、マグネシウム大量等）を避ける。",
    pearl: "【禁忌】重症筋無力症 × アミノグリコシド。"
  },
  {
    id: "psy-001",
    subject: "精神科",
    topic: "自殺リスクの評価",
    importance: 3,
    type: "single",
    stem: "うつ病の患者が『死にたい』と訴えている。初期対応として最も適切なのはどれか。1つ選べ。",
    choices: [
      { text: "希死念慮の有無・具体的な計画・手段を率直に確認する", correct: true, forbidden: false,
        note: "自殺について尋ねることは自殺を誘発しない。リスク評価と安全確保が最優先。" },
      { text: "自殺の話題には触れず、話をそらす", correct: false, forbidden: true,
        note: "リスク評価の放棄であり、安全確保の機会を失う致命的な対応。" },
      { text: "『気の持ちよう』と励まして帰宅させる", correct: false, forbidden: true,
        note: "評価なしの安易な帰宅は重大な危険。" },
      { text: "本人の同意なく即座に身体拘束する", correct: false, forbidden: false,
        note: "まず評価と対話。拘束は要件を満たす場合の最終手段。" }
    ],
    explanation: "希死念慮は率直に評価する。尋ねることで自殺は増えない。計画性・手段・準備の有無を確認し、安全を確保する。",
    pearl: "【必修】希死念慮は『触れない』が最悪。まず率直に評価。"
  },
  {
    id: "inf-001",
    subject: "感染症",
    topic: "髄膜炎菌性髄膜炎の対応",
    importance: 2,
    type: "single",
    stem: "細菌性髄膜炎が強く疑われ、ショックの兆候もある患者。初期対応として避けるべきものはどれか。1つ選べ。",
    choices: [
      { text: "抗菌薬投与を後回しにし、全画像検査完了まで待つ", correct: false, forbidden: true,
        note: "細菌性髄膜炎で抗菌薬を遅らせるのは予後を著しく悪化させる。疑ったら速やかに開始する。" },
      { text: "速やかに経験的抗菌薬を開始する", correct: true, forbidden: false,
        note: "疑った時点で早期投与。腰椎穿刺前でも遅らせない。" },
      { text: "血液培養を可能な範囲で採取する", correct: false, forbidden: false, note: "投与前が理想だが投与を遅らせない。" },
      { text: "全身管理・輸液を行う", correct: false, forbidden: false, note: "適切。" }
    ],
    explanation: "細菌性髄膜炎は時間との勝負。疑ったら経験的抗菌薬を速やかに開始し、検査のために治療を遅らせない。",
    pearl: "【禁忌的対応】細菌性髄膜炎で抗菌薬を『検査待ち』で遅らせない。"
  },
  {
    id: "ped-001",
    subject: "小児科",
    topic: "小児のアスピリン",
    importance: 2,
    type: "single",
    stem: "インフルエンザ罹患中の6歳児。発熱に対する解熱薬として避けるべきものはどれか。1つ選べ。",
    choices: [
      { text: "アスピリン", correct: true, forbidden: true,
        note: "小児のウイルス感染（インフルエンザ・水痘）でReye症候群のリスク。原則使用しない。" },
      { text: "アセトアミノフェン", correct: false, forbidden: false, note: "小児の解熱に安全な第一選択。" },
      { text: "冷却などの対症的ケア", correct: false, forbidden: false, note: "問題ない。" },
      { text: "十分な水分補給", correct: false, forbidden: false, note: "適切。" }
    ],
    explanation: "小児のウイルス感染症にアスピリンはReye症候群を招きうるため避け、アセトアミノフェンを用いる。",
    pearl: "【禁忌】小児のインフル・水痘 × アスピリン（Reye症候群）。"
  },
  {
    id: "res-001",
    subject: "呼吸器",
    topic: "緊張性気胸",
    importance: 3,
    type: "single",
    stem: "胸部外傷後、患側呼吸音消失・頸静脈怒張・血圧低下・気管偏位を認める。最初に行うべき処置はどれか。1つ選べ。",
    choices: [
      { text: "直ちに胸腔穿刺（脱気）を行う", correct: true, forbidden: false,
        note: "緊張性気胸は臨床診断で即減圧。画像を待たない。" },
      { text: "まず胸部X線・CTで確定してから処置する", correct: false, forbidden: true,
        note: "緊張性気胸で画像確定を待つのは致命的遅延。臨床診断で即減圧すべき。" },
      { text: "経過観察", correct: false, forbidden: true, note: "急速に心停止に至りうる。放置は致命的。" },
      { text: "酸素投与のみで様子を見る", correct: false, forbidden: false, note: "酸素は行うが減圧が必須。" }
    ],
    explanation: "緊張性気胸は臨床診断で直ちに減圧（胸腔穿刺→胸腔ドレナージ）。画像確定を待ってはいけない。",
    pearl: "【必修】緊張性気胸は画像を待たず即減圧。"
  },
  {
    id: "pha-001",
    subject: "薬理/救急",
    topic: "MAO阻害薬と相互作用",
    importance: 1,
    type: "single",
    stem: "非選択的MAO阻害薬を服用中の患者。併用で高血圧クリーゼやセロトニン症候群の危険が高い組み合わせはどれか。1つ選べ。",
    choices: [
      { text: "ペチジン（メペリジン）などの一部オピオイド／SSRIとの併用", correct: true, forbidden: true,
        note: "MAO阻害薬との併用でセロトニン症候群・高血圧クリーゼを招く。併用禁忌。" },
      { text: "アセトアミノフェン単剤", correct: false, forbidden: false, note: "相互作用の懸念は低い。" },
      { text: "生理食塩水輸液", correct: false, forbidden: false, note: "問題ない。" },
      { text: "外用保湿剤", correct: false, forbidden: false, note: "無関係。" }
    ],
    explanation: "MAO阻害薬はセロトニン作動薬（SSRI、一部オピオイド、チラミン含有食品等）との併用で重篤な反応を起こす。併用禁忌を押さえる。",
    pearl: "【禁忌】MAO阻害薬 × SSRI/ペチジン/チラミン。"
  },
  {
    id: "pub-001",
    subject: "公衆衛生",
    topic: "届出義務",
    importance: 1,
    type: "single",
    stem: "感染症法において、診断後『直ちに』最寄りの保健所へ届け出る必要がある一類・二類感染症に該当するのはどれか。1つ選べ。",
    choices: [
      { text: "結核", correct: true, forbidden: false, note: "二類感染症で届出対象。" },
      { text: "普通感冒（かぜ症候群）", correct: false, forbidden: false, note: "届出対象ではない。" },
      { text: "軽度の擦過傷", correct: false, forbidden: false, note: "感染症届出とは無関係。" },
      { text: "生活習慣病（高血圧）", correct: false, forbidden: false, note: "届出対象ではない。" }
    ],
    explanation: "感染症法の分類と届出義務は必修事項。結核は二類感染症で届出対象。分類ごとの代表疾患を整理しておく。",
    pearl: "【必修知識】感染症の類型と届出（結核＝二類）。"
  },
  {
    id: "gas-002",
    subject: "消化器",
    topic: "上部消化管出血の初期対応",
    importance: 2,
    type: "multiple",
    pick: 2,
    stem: "吐血で来院しショック徴候のある患者。初期対応として適切なものはどれか。2つ選べ。",
    choices: [
      { text: "太い静脈路の確保と輸液・輸血の準備", correct: true, forbidden: false,
        note: "循環の安定化が最優先。ABCの徹底。" },
      { text: "全身状態を安定させたうえで上部消化管内視鏡", correct: true, forbidden: false,
        note: "止血の診断・治療の要。まず循環を立て直す。" },
      { text: "循環が不安定なまま経口的に大量の水分を飲ませる", correct: false, forbidden: true,
        note: "誤嚥・状態悪化を招く危険な対応。" },
      { text: "抗凝固薬をそのまま継続する", correct: false, forbidden: false,
        note: "出血源評価のうえで中止・拮抗を検討するのが原則。" }
    ],
    explanation: "消化管出血ではまず循環の安定化（輸液・輸血）と気道確保、そのうえで内視鏡的止血。危険な経口摂取や漫然とした抗凝固継続は避ける。",
    pearl: "出血性ショックは『まずABC・循環』。原因検索は次。"
  },
  {
    id: "nep-001",
    subject: "腎臓/代謝",
    topic: "高カリウム血症の緊急対応",
    importance: 2,
    type: "single",
    stem: "血清K 7.2 mEq/L、心電図でテント状T波を認める。心筋保護のためにまず投与すべきものはどれか。1つ選べ。",
    choices: [
      { text: "グルコン酸カルシウム静注", correct: true, forbidden: false,
        note: "心筋膜の安定化（心保護）が最優先。Kを下げる作用はないが致死性不整脈を防ぐ。" },
      { text: "カリウムを含む輸液の急速投与", correct: false, forbidden: true,
        note: "高K血症をさらに悪化させる致命的な誤り。" },
      { text: "GI療法（グルコース+インスリン）", correct: false, forbidden: false,
        note: "Kを細胞内へ移す。心保護のCaに続いて行う。" },
      { text: "陽イオン交換樹脂", correct: false, forbidden: false, note: "作用は緩徐で緊急時の第一手ではない。" }
    ],
    explanation: "心電図変化を伴う高K血症では、まずカルシウムで心筋を保護し、続いてGI療法・利尿・透析などでKを下げる。K含有輸液は禁忌的誤り。",
    pearl: "高K + 心電図変化 ＝ まずCaで心保護。K投与は論外。"
  },
  {
    id: "cir-004",
    subject: "循環器",
    topic: "刺激伝導系のシェーマ",
    importance: 1,
    type: "single",
    stem: "図は心臓の刺激伝導系を示す模式図である。房室結節（AV結節）を示すのはどれか。1つ選べ。",
    // 自己完結のSVGシェーマ（外部ファイル不要）
    image: "data:image/svg+xml;utf8," + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="420" height="340" viewBox="0 0 420 340" font-family="sans-serif">' +
      '<rect width="420" height="340" fill="#ffffff"/>' +
      '<path d="M210 90 C 168 24, 78 44, 90 126 C 100 196, 172 252, 210 300 C 248 252, 320 196, 330 126 C 342 44, 252 24, 210 90 Z" fill="#fdecec" stroke="#dc2626" stroke-width="2"/>' +
      '<path d="M252 104 Q 216 134 212 162 Q 208 196 204 238" fill="none" stroke="#b45309" stroke-width="3" stroke-dasharray="2 5"/>' +
      '<path d="M204 238 L 176 280 M204 238 L 236 280" fill="none" stroke="#b45309" stroke-width="3" stroke-dasharray="2 5"/>' +
      '<circle cx="252" cy="104" r="11" fill="#2563eb"/><text x="252" y="109" font-size="14" fill="#fff" text-anchor="middle" font-weight="bold">A</text>' +
      '<circle cx="212" cy="162" r="11" fill="#2563eb"/><text x="212" y="167" font-size="14" fill="#fff" text-anchor="middle" font-weight="bold">B</text>' +
      '<circle cx="206" cy="206" r="11" fill="#2563eb"/><text x="206" y="211" font-size="14" fill="#fff" text-anchor="middle" font-weight="bold">C</text>' +
      '<circle cx="204" cy="252" r="11" fill="#2563eb"/><text x="204" y="257" font-size="14" fill="#fff" text-anchor="middle" font-weight="bold">D</text>' +
      '</svg>'
    ),
    imageAlt: "心臓の刺激伝導系の模式図。A〜Dの4点が示されている。",
    choices: [
      { text: "A", correct: false, forbidden: false, note: "上方（心房上部）にあり洞結節（SA結節）に相当する。" },
      { text: "B", correct: true, forbidden: false, note: "心房と心室の境界部にあり房室結節（AV結節）に相当する。" },
      { text: "C", correct: false, forbidden: false, note: "房室結節の下方に続くヒス束に相当する。" },
      { text: "D", correct: false, forbidden: false, note: "さらに末梢の脚〜プルキンエ線維に相当する。" }
    ],
    explanation: "刺激は洞結節(A)→房室結節(B)→ヒス束(C)→脚・プルキンエ線維(D)の順に伝わる。房室結節は心房と心室の境界部に位置する。",
    pearl: "画像問題の練習用デモ。伝導系の順序：洞結節→房室結節→ヒス束→プルキンエ。"
  }
];
