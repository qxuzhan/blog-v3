<script setup lang="ts">
import { ZButton } from '#components'

const props = defineProps<{
  pid: string
  key: string
  title?: string
  defaultAmount?: string
}>()

const paymentType = ref<'alipay' | 'wxpay'>('alipay')
const amount = ref(props.defaultAmount || '5')
const isLoading = ref(false)

const amountOptions = ['1', '3', '5', '10', '20', '50']

async function handlePay() {
  isLoading.value = true

  const outTradeNo = `donate_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  const clientIp = await getClientIp()

  try {
    const signData = await $fetch<{
      pid: string
      type: string
      out_trade_no: string
      name: string
      money: string
      clientip: string
      device: string
      sign_type: string
      sign: string
    }>('/api/xpay-sign', {
      method: 'POST',
      body: {
        pid: props.pid,
        type: paymentType.value,
        out_trade_no: outTradeNo,
        name: props.title || '赞助作者',
        money: amount.value,
        clientip: clientIp,
        device: 'pc',
        key: props.key,
      },
    })

    const form = document.createElement('form')
    form.method = 'POST'
    form.action = 'https://pay.rliyun.cn/xpay/epay/submit.php'
    form.target = '_blank'

    for (const [key, value] of Object.entries(signData)) {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = key
      input.value = value
      form.appendChild(input)
    }

    document.body.appendChild(form)
    form.submit()
    document.body.removeChild(form)
  }
  catch (error) {
    console.error('Payment error:', error)
  }
  finally {
    isLoading.value = false
  }
}

async function getClientIp() {
  try {
    const res = await fetch('https://api.ipify.org?format=json')
    const data = await res.json()
    return data.ip
  }
  catch {
    return '127.0.0.1'
  }
}
</script>

<template>
  <div class="xpay-donation">
    <div class="payment-type">
      <ZButton
        :type="paymentType === 'alipay' ? 'primary' : 'default'"
        text="支付宝"
        @click="paymentType = 'alipay'"
      />
      <ZButton
        :type="paymentType === 'wxpay' ? 'primary' : 'default'"
        text="微信"
        @click="paymentType = 'wxpay'"
      />
    </div>

    <div class="amount-select">
      <ZButton
        v-for="opt in amountOptions"
        :key="opt"
        :type="amount === opt ? 'primary' : 'default'"
        :text="`${opt}元`"
        @click="amount = opt"
      />
    </div>

    <ZButton
      class="pay-button"
      type="primary"
      :loading="isLoading"
      text="立即赞助"
      icon="ph:heart-fill"
      @click="handlePay"
    />
  </div>
</template>

<style lang="scss" scoped>
.xpay-donation {
	display: flex;
	flex-direction: column;
	gap: 1rem;
	padding: 0.5rem;
	min-width: 200px;
}

.payment-type {
	display: flex;
	justify-content: center;
	gap: 0.5rem;
}

.amount-select {
	display: flex;
	justify-content: center;
	flex-wrap: wrap;
	gap: 0.5rem;
}

.pay-button {
	width: 100%;
}
</style>
